/* ==========================================================================
   CONFIG general del juego (no depende del jugador ni del jefe).
   Tiempos en segundos, distancias en píxeles de la resolución lógica.
   ========================================================================== */
export const CONFIG_JUEGO = {
  lienzo: {
    ancho: 960,                 // resolución lógica (se escala a la ventana manteniendo proporción)
    alto: 640,
  },
  arena: {
    margen: 36,                 // distancia del borde del lienzo al muro interior (arena interior = 888 x 568)
  },
  simulacion: {
    paso: 1 / 120,              // paso fijo de física: los tiempos del CONFIG se cumplen igual en cualquier PC
    maxPasosPorFrame: 12,       // tope de pasos por frame si el navegador se traba
  },
  pantalla: {
    sacudida: 7,                // px de sacudida de cámara al recibir un golpe
    duracionSacudida: 0.22,
    esperaPantallaMuerte: 1.4,  // pausa entre morir y mostrar "Has muerto"
    esperaPantallaVictoria: 2.2,// pausa entre derrotar al jefe y mostrar "Victoria"
    duracionTituloJefe: 2.4,    // cuánto se ve el nombre del jefe al empezar
    duracionAnuncio: 2.0,       // textos centrales (ej. cambio de fase)
  },
  ui: {
    // Fuente del texto dibujado en el canvas (nombre del jefe, título inicial, anuncios).
    // Cinzel viene incluida (ver src/main.ts). Para otra, declárala en src/estilos.css y ponla aquí.
    fuente: '"Cinzel", Georgia, serif',
  },
  audio: {
    volumenGeneral: 0.8,        // 0 a 1, multiplica todo
    volumenEfectos: 1.0,        // valor por defecto; el jugador lo cambia en Opciones
    volumenMusica: 0.45,        // valor por defecto; el jugador lo cambia en Opciones
  },
  analisis: {
    margenMinimoRodada: 0.10,   // ventana mínima (s) para cruzar un anillo rodando; menos = aviso en consola
  },
};

export type ConfigAudio = typeof CONFIG_JUEGO.audio;
