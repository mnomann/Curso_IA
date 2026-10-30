import { CONFIG, type Config } from '../config/index.ts';
import { Arena } from './Arena.ts';
import { SistemaParticulas } from './Particulas.ts';
import { Renderizador } from './Renderizador.ts';
import { Jugador } from '../entidades/Jugador.ts';
import type { Entrada } from './Entrada.ts';
import type { ServicioAssets } from './GestorAssets.ts';
import type { VistaPantallas } from './Pantallas.ts';
import type { Jefe } from '../jefes/Jefe.ts';
import type { DefJefe } from '../jefes/registro.ts';

export type EstadoJuego = 'menu' | 'opciones' | 'jugando' | 'pausa' | 'muerte' | 'victoria';
type Resultado = 'muerte' | 'victoria';

export interface OpcionesJuego {
  /** null en las pruebas: el juego corre sin dibujar. */
  canvas: HTMLCanvasElement | null;
  entrada: Entrada;
  assets: ServicioAssets;
  pantallas: VistaPantallas;
}

/**
 * Núcleo del juego: estado global, bucle a paso fijo y los "servicios"
 * que usan el jugador y el jefe (golpear al jugador, dañar al jefe,
 * chispas, anuncios, sonido).
 *
 * El núcleo NO conoce a ningún jefe en particular: solo usa la clase
 * abstracta Jefe (src/jefes/Jefe.ts).
 */
export class Juego {
  readonly config: Config = CONFIG;
  readonly entrada: Entrada;
  readonly assets: ServicioAssets;
  readonly arena: Arena;
  readonly particulas = new SistemaParticulas();
  readonly renderizador: Renderizador | null;
  private readonly pantallas: VistaPantallas;

  estado: EstadoJuego = 'menu';
  defJefe: DefJefe | null = null;
  tiempo = 0;
  combateActivo = false;
  sacudida = 0;
  anuncio: { texto: string; t: number } | null = null;
  debug = false;
  vidaJefeMostrada = 0;

  private _jugador: Jugador | null = null;
  private _jefe: Jefe | null = null;
  private acumulado = 0;
  private ultimo = 0;
  private resultado: Resultado | null = null;
  private temporizadorFin: number | null = null;
  private estadoAntesDeOpciones: 'menu' | 'pausa' | null = null;

  constructor({ canvas, entrada, assets, pantallas }: OpcionesJuego) {
    this.entrada = entrada;
    this.assets = assets;
    this.pantallas = pantallas;
    this.arena = new Arena(CONFIG.arena, CONFIG.lienzo, assets);
    this.renderizador = canvas ? new Renderizador(this, canvas) : null;
  }

  /** true mientras hay una pelea cargada (jugando, en pausa, o en la pantalla de muerte/victoria). */
  get enPelea(): boolean { return this._jugador !== null && this._jefe !== null; }

  /** El jugador de la pelea actual. Solo se usa con una pelea cargada. */
  get jugador(): Jugador {
    if (!this._jugador) throw new Error('No hay una pelea en curso.');
    return this._jugador;
  }

  /** El jefe de la pelea actual. Solo se usa con una pelea cargada. */
  get jefe(): Jefe {
    if (!this._jefe) throw new Error('No hay una pelea en curso.');
    return this._jefe;
  }

  // ------------------------------------------------------------- flujo
  iniciarPelea(def: DefJefe): void {
    this.defJefe = def;
    const a = this.arena;
    this._jugador = new Jugador(this, a.cx, a.y1 - 80);
    this._jefe = def.crear(this);
    this.vidaJefeMostrada = this._jefe.vidaMax;
    this.tiempo = 0;
    this.acumulado = 0;
    this.combateActivo = true;
    this.resultado = null;
    this.temporizadorFin = null;
    this.sacudida = 0;
    this.anuncio = null;
    this.particulas.limpiar();
    this.entrada.limpiar();
    this.assets.detenerMusica();
    if (def.musica) this.assets.musica(def.musica);
    this.cambiarEstado('jugando');
  }

  reintentar(): void {
    if (this.defJefe) this.iniciarPelea(this.defJefe);
  }

  irAlMenu(): void {
    this._jefe = null;
    this._jugador = null;
    this.assets.musica('musica.menu');
    this.cambiarEstado('menu');
  }

  /** Abre las opciones desde el menú o desde la pausa, y vuelve al mismo lugar al cerrar. */
  abrirOpciones(): void {
    if (this.estado !== 'menu' && this.estado !== 'pausa') return;
    this.estadoAntesDeOpciones = this.estado;
    // desde la pausa, la música vuelve a sonar para que se escuche el cambio de volumen
    if (this.estado === 'pausa') this.assets.reanudarMusica();
    this.cambiarEstado('opciones');
  }

  cerrarOpciones(): void {
    if (this.estado !== 'opciones') return;
    const volver = this.estadoAntesDeOpciones ?? 'menu';
    if (volver === 'pausa') this.assets.pausarMusica();
    this.cambiarEstado(volver);
  }

  alternarPausa(): void {
    if (this.estado === 'opciones') { this.cerrarOpciones(); return; }
    if (this.estado === 'jugando') {
      this.assets.pausarMusica();
      this.cambiarEstado('pausa');
    } else if (this.estado === 'pausa') {
      this.entrada.limpiar();
      this.assets.reanudarMusica();
      this.cambiarEstado('jugando');
    }
  }

  private cambiarEstado(nombre: EstadoJuego): void {
    this.estado = nombre;
    if (nombre === 'victoria') { this.assets.detenerMusica(); this.assets.sonar('ui.victoria'); }
    if (nombre === 'muerte') this.assets.detenerMusica();
    this.pantallas.mostrar(nombre, this);
    if (nombre === 'jugando') this.ultimo = performance.now();
  }

  // ------------------------------------------------------------- servicios
  /** Daña al jugador. Devuelve true si el golpe se aplicó (false si era invulnerable). */
  golpearJugador(danio: number, origenX: number, origenY: number): boolean {
    if (!this.combateActivo) return false;
    if (!this.jugador.recibirGolpe(danio, origenX, origenY)) return false;
    this.sacudida = CONFIG.pantalla.duracionSacudida;
    if (this.jugador.muerto) this.terminar('muerte', CONFIG.pantalla.esperaPantallaMuerte);
    return true;
  }

  /** Daña al jefe y gestiona sus cambios de fase de forma genérica. */
  aplicarDanioAJefe(cantidad: number): boolean {
    const j = this.jefe;
    if (!j.recibirDanio(cantidad)) return false;
    const umbrales = j.umbralesFase;
    while (j.vida > 0 && j.fase - 1 < umbrales.length && j.vida / j.vidaMax <= (umbrales[j.fase - 1] ?? 0)) {
      j.cambiarFase(j.fase + 1);
    }
    return true;
  }

  chispas(x: number, y: number, color: string, cantidad: number, velocidad?: number): void {
    this.particulas.emitir(x, y, color, cantidad, velocidad);
  }

  anunciar(texto: string): void { this.anuncio = { texto, t: 0 }; }

  private terminar(resultado: Resultado, espera: number): void {
    if (this.temporizadorFin !== null) return;
    this.combateActivo = false;
    this.resultado = resultado;
    this.temporizadorFin = espera;
  }

  // ------------------------------------------------------------- simulación
  actualizar(dt: number): void {
    this.tiempo += dt;
    this.entrada.tick(dt);
    this.jugador.actualizar(dt);
    this.jefe.actualizar(dt);
    this.particulas.actualizar(dt);

    const j = this.jefe;
    this.vidaJefeMostrada = this.vidaJefeMostrada > j.vida
      ? Math.max(j.vida, this.vidaJefeMostrada - j.vidaMax * 0.35 * dt) : j.vida;
    if (this.sacudida > 0) this.sacudida -= dt;
    if (this.anuncio) {
      this.anuncio.t += dt;
      if (this.anuncio.t > CONFIG.pantalla.duracionAnuncio) this.anuncio = null;
    }

    if (j.vida <= 0) this.terminar('victoria', CONFIG.pantalla.esperaPantallaVictoria);
    if (this.temporizadorFin !== null && this.resultado) {
      this.temporizadorFin -= dt;
      if (this.temporizadorFin <= 0) this.cambiarEstado(this.resultado);
    }
  }

  /** Un frame del navegador: corre N pasos fijos de física y dibuja. */
  frame(ahora: number): void {
    let dt = (ahora - this.ultimo) / 1000;
    this.ultimo = ahora;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(dt, 0.25);
    if (this.estado === 'jugando') {
      const h = CONFIG.simulacion.paso, max = CONFIG.simulacion.maxPasosPorFrame;
      this.acumulado += dt;
      let pasos = 0;
      while (this.acumulado >= h && pasos < max && this.estado === 'jugando') {
        this.actualizar(h);
        this.acumulado -= h;
        pasos++;
      }
      if (pasos >= max) this.acumulado = 0;
    }
    if (this.enPelea) this.renderizador?.dibujar();
  }

  arrancar(): void {
    this.ultimo = performance.now();
    const bucle = (ahora: number) => { requestAnimationFrame(bucle); this.frame(ahora); };
    requestAnimationFrame(bucle);
  }
}
