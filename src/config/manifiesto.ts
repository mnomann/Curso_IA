/* ==========================================================================
   MANIFIESTO DE ASSETS — aquí se activan los archivos finales.

   Para agregar un asset:
     1. Copia el archivo a public/ en la ruta indicada en "ruta"
        (ej: 'assets/sprites/ui/frasco.png' -> public/assets/sprites/ui/frasco.png).
     2. Cambia listo: false  ->  listo: true.
   Eso es todo. Si un asset no está listo o no carga, el juego sigue usando la
   forma geométrica (imágenes) o el silencio (sonidos). Detalles de tamaño y
   orientación de cada uno en ASSETS.md.

   TypeScript revisa las claves: si en el código escribes assets.imagen('relojero.esfra'),
   el error aparece antes de jugar.
   ========================================================================== */

export interface EntradaImagen {
  ruta: string;
  listo: boolean;
}

export interface EntradaSonido {
  ruta: string;
  listo: boolean;
  /** 0 a 1, opcional: sirve para nivelar archivos que suenan más fuerte que otros. */
  volumen?: number;
  /** Solo música: duración exacta del ciclo en segundos. Se repite sin hueco usando Web Audio. */
  bucle?: number;
}

const imagenes = {
  // ---------------------------------------------------------------- arena
  'arena.suelo':           { ruta: 'assets/sprites/arena/suelo.jpg',                listo: true },

  // ---------------------------------------------------------------- jugador
  // Variantes de color en public/assets/sprites/jugador/variantes/: para cambiar, cambia la ruta.
  'jugador.cuerpo':        { ruta: 'assets/sprites/jugador/cuerpo.png',             listo: true },

  // ---------------------------------------------------------------- Relojero
  'relojero.esfera':       { ruta: 'assets/sprites/jefes/relojero/esfera.png',       listo: true },
  'relojero.esferaFase2':  { ruta: 'assets/sprites/jefes/relojero/esfera-fase2.png', listo: true },
  'relojero.agujaLarga':   { ruta: 'assets/sprites/jefes/relojero/aguja-larga.png',  listo: false },
  'relojero.agujaCorta':   { ruta: 'assets/sprites/jefes/relojero/aguja-corta.png',  listo: false },
  'relojero.engranaje':    { ruta: 'assets/sprites/jefes/relojero/engranaje.png',    listo: false },
  'relojero.llave':        { ruta: 'assets/sprites/jefes/relojero/llave.png',        listo: false },

  // ---------------------------------------------------------------- interfaz
  // Ilustración del menú de inicio (ver ASSETS.md). Sin ella, se usa el suelo con la esfera del jefe.
  'ui.fondoMenu':          { ruta: 'assets/fondos/menu.jpg',                       listo: false },
  'ui.frasco':             { ruta: 'assets/sprites/ui/frasco.png',                  listo: false },
  'ui.frascoVacio':        { ruta: 'assets/sprites/ui/frasco-vacio.png',            listo: false },
} satisfies Record<string, EntradaImagen>;

// Los efectos los generan herramientas/capas_orquestales.mjs + herramientas/generar_sonidos.py.
const sonidos = {
  // ---------------------------------------------------------------- jugador
  'jugador.ataque':            { ruta: 'assets/sonidos/jugador/ataque.mp3',    listo: true },
  'jugador.impacto':           { ruta: 'assets/sonidos/jugador/impacto.mp3',   listo: true },
  'jugador.rodada':            { ruta: 'assets/sonidos/jugador/rodada.mp3',    listo: true },
  'jugador.curacion':          { ruta: 'assets/sonidos/jugador/curacion.mp3',  listo: true },
  'jugador.herido':            { ruta: 'assets/sonidos/jugador/herido.mp3',    listo: true },
  'jugador.muerte':            { ruta: 'assets/sonidos/jugador/muerte.mp3',    listo: true },

  // ---------------------------------------------------------------- Relojero
  'relojero.avisoBarrido':     { ruta: 'assets/sonidos/jefes/relojero/aviso-barrido.mp3',     listo: true },
  'relojero.barrido':          { ruta: 'assets/sonidos/jefes/relojero/barrido.mp3',           listo: true },
  'relojero.campanada':        { ruta: 'assets/sonidos/jefes/relojero/campanada.mp3',         listo: true },
  'relojero.engranajeFijado':  { ruta: 'assets/sonidos/jefes/relojero/engranaje-fijado.mp3',  listo: true },
  'relojero.engranajeDisparo': { ruta: 'assets/sonidos/jefes/relojero/engranaje-disparo.mp3', listo: true },
  'relojero.fase2':            { ruta: 'assets/sonidos/jefes/relojero/fase2.mp3',             listo: true },
  'relojero.muerte':           { ruta: 'assets/sonidos/jefes/relojero/muerte.mp3',            listo: true },

  // ---------------------------------------------------------------- interfaz y música
  'ui.victoria':               { ruta: 'assets/sonidos/ui/victoria.mp3',       listo: true },
  'musica.menu':               { ruta: 'assets/musica/menu.mp3',               listo: false, volumen: 0.8 },
  'musica.relojero':           { ruta: 'assets/musica/relojero.mp3',           listo: true, bucle: 64 }, // bucle: segundos exactos del ciclo
} satisfies Record<string, EntradaSonido>;

export type ClaveImagen = keyof typeof imagenes;
export type ClaveSonido = keyof typeof sonidos;

export interface Manifiesto {
  imagenes: Record<ClaveImagen, EntradaImagen>;
  sonidos: Record<ClaveSonido, EntradaSonido>;
}

export const MANIFIESTO: Manifiesto = { imagenes, sonidos };
