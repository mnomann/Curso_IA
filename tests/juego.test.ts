/**
 * Pruebas de la lógica del juego, sin navegador: npm test
 *
 * Corren la simulación real (mismo paso de física que el juego) con un jugador
 * automático, y verifican la matemática de esquiva del anillo contra la fórmula
 * de src/jefes/relojero/analisis.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/config/index.ts';
import { JEFES, type DefJefe } from '../src/jefes/registro.ts';
import { Entrada } from '../src/nucleo/Entrada.ts';
import { Juego, type EstadoJuego } from '../src/nucleo/Juego.ts';
import type { ServicioAssets } from '../src/nucleo/GestorAssets.ts';
import { Preferencias, deslizadorAGanancia, gananciaADeslizador, type Almacen } from '../src/nucleo/Preferencias.ts';
import { Relojero } from '../src/jefes/relojero/Relojero.ts';
import { Anillo } from '../src/jefes/relojero/proyectiles/Anillo.ts';
import { analizarRelojero } from '../src/jefes/relojero/analisis.ts';

const PASO = CONFIG.simulacion.paso;
const RELOJERO = JEFES.find((j) => j.id === 'relojero') as DefJefe;

/** Assets en silencio: el juego dibuja formas geométricas y no suena nada. */
class AssetsSilencio implements ServicioAssets {
  readonly sonidos: string[] = [];
  imagen() { return null; }
  sonar(clave: string) { this.sonidos.push(clave); }
  musica() {}
  pausarMusica() {}
  reanudarMusica() {}
  detenerMusica() {}
}

function crearJuego() {
  const estados: EstadoJuego[] = [];
  const assets = new AssetsSilencio();
  let juego: Juego;
  const entrada = new Entrada(CONFIG.jugador.bufferEntrada, {
    estaJugando: () => juego.estado === 'jugando',
    alPausar: () => juego.alternarPausa(),
    alDepurar: () => {},
  });
  juego = new Juego({ canvas: null, entrada, assets, pantallas: { mostrar: (e) => estados.push(e) } });
  return { juego, entrada, assets, estados };
}

/** Azar con semilla: las pruebas dan siempre el mismo resultado. */
function azarConSemilla(semilla: number) {
  let s = semilla >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(azarConSemilla(2026)); });
afterEach(() => { vi.restoreAllMocks(); });

describe('pelea completa con un jugador automático', () => {
  it('termina siempre, sin errores ni valores inválidos, y usa los tres ataques', () => {
    const { juego, entrada } = crearJuego();
    const ataques = new Set<string>();
    let llegoAFase2 = 0;
    const finales: string[] = [];

    for (let pelea = 0; pelea < 25; pelea++) {
      juego.iniciarPelea(RELOJERO);
      const jefe = juego.jefe as Relojero;
      let t = 0, vioFase2 = false;
      while (juego.estado === 'jugando' && t < 300) {
        const p = juego.jugador;
        if (Math.random() < 0.05) {
          entrada.teclas.clear();
          entrada.teclas.add(jefe.x > p.x ? 'KeyD' : 'KeyA');
          entrada.teclas.add(jefe.y > p.y ? 'KeyS' : 'KeyW');
        }
        if (Math.random() < 0.02) { entrada.teclas.clear(); entrada.teclas.add(['KeyW', 'KeyA', 'KeyS', 'KeyD'][Math.floor(Math.random() * 4)] as string); }
        if (Math.random() < 0.035) entrada.pulsar('atacar');
        if (Math.random() < 0.01) entrada.pulsar('rodar');
        if (p.vida < 40 && Math.random() < 0.01) entrada.pulsar('curar');
        juego.actualizar(PASO);
        if (jefe.ataque) ataques.add(jefe.ataque.nombre);
        if (jefe.fase === 2) vioFase2 = true;
        for (const v of [p.x, p.y, p.vida, p.estamina, jefe.x, jefe.y, jefe.vida]) expect(Number.isFinite(v)).toBe(true);
        t += PASO;
      }
      if (vioFase2) llegoAFase2++;
      finales.push(juego.estado);
    }

    expect(finales.every((e) => e === 'muerte' || e === 'victoria')).toBe(true);
    expect(llegoAFase2).toBeGreaterThan(0);
    expect([...ataques].sort()).toEqual(['BarridoAguja', 'Campanada', 'LanzarEngranaje']);
  });
});

describe('fases, victoria y muerte', () => {
  it('pasa a fase 2 a la mitad de la vida y es invulnerable durante la transición', () => {
    const { juego } = crearJuego();
    juego.iniciarPelea(RELOJERO);
    const jefe = juego.jefe as Relojero;
    juego.aplicarDanioAJefe(CONFIG.jefes.relojero.vidaMax / 2 + 5);
    expect(jefe.fase).toBe(2);
    expect(jefe.estado).toBe('transicion');
    expect(juego.aplicarDanioAJefe(10)).toBe(false);
    for (let i = 0; i < Math.ceil(CONFIG.jefes.relojero.transicionFase / PASO) + 2; i++) juego.actualizar(PASO);
    expect(jefe.invulnerable).toBe(false);
  });

  it('muestra la victoria tras la espera configurada', () => {
    const { juego, estados, assets } = crearJuego();
    juego.iniciarPelea(RELOJERO);
    juego.aplicarDanioAJefe(9999);
    let t = 0;
    while (juego.estado === 'jugando' && t < 5) { juego.actualizar(PASO); t += PASO; }
    expect(juego.estado).toBe('victoria');
    expect(estados.at(-1)).toBe('victoria');
    expect(t).toBeCloseTo(CONFIG.pantalla.esperaPantallaVictoria, 1);
    expect(assets.sonidos).toContain('ui.victoria');
  });

  it('muestra la muerte cuando la vida del jugador llega a cero', () => {
    const { juego } = crearJuego();
    juego.iniciarPelea(RELOJERO);
    juego.golpearJugador(9999, 0, 0);
    let t = 0;
    while (juego.estado === 'jugando' && t < 5) { juego.actualizar(PASO); t += PASO; }
    expect(juego.estado).toBe('muerte');
    expect(t).toBeCloseTo(CONFIG.pantalla.esperaPantallaMuerte, 1);
  });
});

describe('esquiva del anillo (campanada)', () => {
  /** Mide, con la física real, cuántos ms de margen hay para pulsar la rodada. */
  function ventanaDeEsquiva(direccion: 'hacia' | 'lado', distancia: number): number {
    let exitos = 0;
    const paso = 0.005;
    for (let desfase = -0.8; desfase <= 0.1; desfase += paso) {
      const { juego } = crearJuego();
      juego.iniciarPelea(RELOJERO);
      const jefe = juego.jefe as Relojero, p = juego.jugador;
      jefe.entrar('pausa', 1e9); // jefe quieto: solo el anillo
      p.x = jefe.x + distancia; p.y = jefe.y;
      const A = CONFIG.jefes.relojero.campanada;
      jefe.agregarProyectil(new Anillo(juego, jefe.x, jefe.y, jefe.r, A.velocidad));
      const contacto = (distancia - p.r - A.grosor / 2 - jefe.r) / A.velocidad;
      let t = 0, rodo = false, golpeado = false;
      while (t < 2.5 && !golpeado) {
        if (!rodo && t >= contacto + desfase) {
          rodo = true;
          if (direccion === 'hacia') p.rodar(-1, 0); else p.rodar(0, 1);
        }
        const vida = p.vida;
        juego.actualizar(PASO);
        golpeado = p.vida < vida;
        t += PASO;
      }
      if (!golpeado) exitos++;
    }
    return exitos * paso * 1000;
  }

  it('rodando hacia el jefe hay ~630 ms para pulsar, como dice el análisis', () => {
    const medido = ventanaDeEsquiva('hacia', 260);
    const calculado = (analizarRelojero().tabla[0]?.ventana_pulsacion_s ?? 0) * 1000;
    expect(medido).toBeGreaterThan(500);
    expect(Math.abs(medido - calculado)).toBeLessThan(30);
  });

  it('rodando de lado casi no hay margen (diseño conocido)', () => {
    expect(ventanaDeEsquiva('lado', 240)).toBeLessThan(60);
  });

  it('el análisis no reporta problemas con el CONFIG actual', () => {
    expect(analizarRelojero().problemas).toBe(false);
  });
});

describe('opciones y volumen', () => {
  it('abre opciones desde el menú y desde la pausa, y vuelve al mismo lugar', () => {
    const { juego } = crearJuego();
    juego.irAlMenu();
    juego.abrirOpciones();
    expect(juego.estado).toBe('opciones');
    juego.alternarPausa(); // Esc
    expect(juego.estado).toBe('menu');

    juego.iniciarPelea(RELOJERO);
    juego.alternarPausa();
    expect(juego.estado).toBe('pausa');
    juego.abrirOpciones();
    juego.cerrarOpciones();
    expect(juego.estado).toBe('pausa');
    juego.alternarPausa();
    expect(juego.estado).toBe('jugando');
  });

  it('guarda el volumen y lo recupera; tolera datos dañados y almacenamiento bloqueado', () => {
    const datos = new Map<string, string>();
    const almacen: Almacen = { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => { datos.set(k, v); } };
    const porDefecto = { musica: 67, efectos: 100 };

    new Preferencias(porDefecto, almacen).set('musica', 30);
    expect(new Preferencias(porDefecto, almacen).get('musica')).toBe(30);

    datos.set('relojero-sin-hora.preferencias', '{roto');
    expect(new Preferencias(porDefecto, almacen).get('musica')).toBe(67);

    const bloqueado: Almacen = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    const p = new Preferencias(porDefecto, bloqueado);
    p.set('efectos', 10);
    expect(p.get('efectos')).toBe(10);
  });

  it('la curva del deslizador es cuadrática e invertible', () => {
    expect(deslizadorAGanancia(50)).toBeCloseTo(0.25);
    expect(gananciaADeslizador(deslizadorAGanancia(73))).toBe(73);
  });
});
