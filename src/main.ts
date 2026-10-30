/**
 * Punto de entrada: crea las piezas, las conecta y arranca el bucle.
 * Es el único archivo que toca window y document directamente.
 */
// Fuentes incluidas en el build (licencia OFL): no dependen de servidores externos.
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import { CONFIG } from './config/index.ts';
import { MANIFIESTO } from './config/manifiesto.ts';
import { JEFES } from './jefes/registro.ts';
import { Entrada } from './nucleo/Entrada.ts';
import { GestorAssets } from './nucleo/GestorAssets.ts';
import { Pantallas } from './nucleo/Pantallas.ts';
import { Juego } from './nucleo/Juego.ts';
import { Preferencias, deslizadorAGanancia, gananciaADeslizador, type Almacen } from './nucleo/Preferencias.ts';

const assets = new GestorAssets(MANIFIESTO, CONFIG.audio);

// Volumen elegido por el jugador (0-100). Por defecto, los valores de src/config/juego.ts.
let almacen: Almacen | null = null;
try { almacen = window.localStorage; } catch { /* almacenamiento bloqueado */ }
const preferencias = new Preferencias({
  musica: gananciaADeslizador(CONFIG.audio.volumenMusica),
  efectos: gananciaADeslizador(CONFIG.audio.volumenEfectos),
}, almacen);
assets.fijarVolumen({
  musica: deslizadorAGanancia(preferencias.get('musica')),
  efectos: deslizadorAGanancia(preferencias.get('efectos')),
});

// Los ganchos se llaman después de crear el juego, por eso pueden usarlo.
let juego: Juego;
const entrada = new Entrada(CONFIG.jugador.bufferEntrada, {
  estaJugando: () => juego.estado === 'jugando',
  alPausar: () => juego.alternarPausa(),
  alDepurar: () => { juego.debug = !juego.debug; },
});
const pantallas = new Pantallas(document, JEFES, {
  alElegir: (def) => juego.iniciarPelea(def),
  alContinuar: () => juego.alternarPausa(),
  alReintentar: () => juego.reintentar(),
  alMenu: () => juego.irAlMenu(),
  alAbrirOpciones: () => juego.abrirOpciones(),
  alCerrarOpciones: () => juego.cerrarOpciones(),
  alCambiarVolumen: (tipo, valor) => {
    preferencias.set(tipo, valor);
    assets.fijarVolumen({ [tipo]: deslizadorAGanancia(valor) });
  },
  alProbarEfectos: () => assets.sonar('jugador.impacto'),
});
pantallas.ponerVolumenes({ musica: preferencias.get('musica'), efectos: preferencias.get('efectos') });

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo');
if (!canvas) throw new Error('Falta <canvas id="lienzo"> en index.html');
juego = new Juego({ canvas, entrada, assets, pantallas });

// Chequeos numéricos del jefe (consola del navegador)
for (const def of JEFES) {
  if (!def.analizar) continue;
  const res = def.analizar();
  console.groupCollapsed(`%cAnálisis: ${def.nombre}`, 'color:#f2c14e');
  console.table(res.tabla);
  console.log(res.lineas.join('\n'));
  console.groupEnd();
  if (res.problemas) console.warn(`${def.nombre}: hay problemas de esquivabilidad en el CONFIG (tecla H en el juego para verlos).`);
}

const renderizador = juego.renderizador;
renderizador?.ajustarTamano(window);
window.addEventListener('resize', () => renderizador?.ajustarTamano(window));
entrada.escuchar(window);

// El canvas no espera a las fuentes por sí solo: se cargan antes de dibujar el primer texto.
const fuentes = ['500 16px Cinzel', '600 16px Cinzel', '700 16px Cinzel', '16px "EB Garamond"', 'italic 16px "EB Garamond"'];
await Promise.all([assets.cargar(), ...fuentes.map((f) => document.fonts.load(f).catch(() => []))]);
pantallas.ponerFondoMenu({
  ilustracion: assets.imagen('ui.fondoMenu')?.src ?? null,
  suelo: assets.imagen('arena.suelo')?.src ?? null,
  esfera: assets.imagen('relojero.esfera')?.src ?? null,
});
juego.irAlMenu();
juego.arrancar();
