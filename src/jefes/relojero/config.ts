/* ==========================================================================
   CONFIG de El Relojero Sin Hora.
   Tiempos en segundos, distancias en px, velocidades en px/s, ángulos en grados.
   ========================================================================== */
export const CONFIG_RELOJERO = {
  nombre: 'El Relojero Sin Hora',
  vidaMax: 420,
  radio: 58,
  umbralesFase: [0.5],         // fracción de vida en que entra a fase 2
  velocidadDesplazamiento: 45, // se acerca lentamente durante las pausas
  distanciaPreferida: 150,     // deja de acercarse a esta distancia del jugador
  pausaInicial: 1.6,           // antes del primer ataque
  pausaEntreAtaques: [0.85, 1.35] as [number, number], // [mín, máx] aleatorio: rompe la memorización pura sin perder el compás
  parpadeoAlRecibirDanio: 0.25,
  transicionFase: 1.8,         // invulnerable mientras cambia de fase
  sprite: {
    // Dónde están las marcas pintadas en esfera.png (fracción del radio, medido sobre la imagen).
    // Las marcas que parpadean al recibir daño se dibujan aquí para coincidir con el arte.
    marcaInterior: 0.62,
    marcaExterior: 0.85,
  },

  barrido: {
    aviso: 0.70,               // cuña roja visible antes del barrido
    duracion: 0.50,            // lo que tarda la aguja en barrer el arco
    arco: 270,
    largoAguja: 175,
    grosorAguja: 8,
    danio: 28,
    recuperacion: 1.0,         // inmóvil tras barrer: ventana de castigo
    ratioAgujaCortaFase2: 0.62,// largo de la aguja corta respecto de la larga (fase 2)
  },
  campanada: {
    aviso: 0.80,               // la esfera se encoge y brilla antes de CADA pulso
    encogimiento: 0.16,        // cuánto se encoge la esfera (fracción del radio)
    pulsosMin: 2,
    pulsosMax: 3,
    velocidad: 260,            // expansión del anillo
    grosor: 10,                // grosor visual y de colisión del anillo
    radioMaximo: 330,          // el anillo se disipa al llegar aquí
    danio: 20,
    darCuerda: 1.5,            // inmóvil tras el último pulso: ventana de castigo
  },
  engranaje: {
    seguimiento: 0.45,         // la línea punteada sigue al jugador
    aviso: 0.60,               // la línea se fija; después dispara
    velocidad: 520,
    radio: 15,
    danio: 18,
    recuperacion: 0.35,
  },
  fase2: {
    multPausa: 0.82,           // ritmo ~18% más rápido: solo se acorta la pausa entre ataques
    multRecuperacion: 1.0,     // ventanas de castigo (1 = iguales que en fase 1)
    multVelocidadAnillo: 1.0,  // 1 = el anillo no acelera (se mantiene esquivable)
    pulsosCampanada: 3,
  },
  // Probabilidad relativa de cada ataque según la distancia al jugador
  pesos: {
    limiteMedio: 330,          // más allá de esto se considera "lejos"
    cerca: { barrido: 4, campanada: 2, engranaje: 1 }, // dentro del alcance de la aguja
    medio: { barrido: 1, campanada: 3, engranaje: 2 },
    lejos: { barrido: 0, campanada: 1, engranaje: 4 },
    maxRepeticiones: 2,        // nunca el mismo ataque más de esto seguido
  },
};

/** Nombres de los ataques (las claves de los pesos). */
export type NombreAtaque = keyof typeof CONFIG_RELOJERO.pesos.cerca;
