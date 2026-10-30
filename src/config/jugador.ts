/* ==========================================================================
   CONFIG del jugador.
   ========================================================================== */
export const CONFIG_JUGADOR = {
  radio: 14,
  vidaMax: 100,
  velocidad: 210,             // caminando, px/s
  estaminaMax: 100,
  regenEstamina: 55,          // por segundo
  pausaRegenEstamina: 0.6,    // tras gastar estamina, espera esto antes de regenerar
  bufferEntrada: 0.15,        // una tecla pulsada se "recuerda" este tiempo si aún no se puede ejecutar
  sprite: {
    // Lado (px) del cuadrado donde se dibuja public/assets/sprites/jugador/cuerpo.png.
    // El cuerpo del dibujo debe coincidir con el círculo de colisión (2 × radio = 28 px);
    // la espada sobresale. Con el sprite actual el lado es 2,74 × el diámetro del cuerpo.
    tamano: 77,
  },

  ataque: {
    costo: 18,                // estamina
    danio: 14,
    alcance: 60,              // desde el centro del jugador
    arco: 110,                // grados del abanico del golpe
    anticipacion: 0.08,       // antes de que el golpe haga daño
    activo: 0.10,             // ventana en que el golpe puede conectar
    recuperacion: 0.22,       // después del golpe, sin poder actuar
    multVelocidad: 0.2,       // fracción de la velocidad de caminar mientras atacas
  },
  rodada: {
    costo: 25,
    velocidad: 420,           // constante durante toda la rodada (la matemática del anillo depende de esto)
    duracion: 0.40,
    inicioInvulnerabilidad: 0.0, // segundos desde que empieza la rodada
    invulnerabilidad: 0.30,   // duración de la invulnerabilidad
    enfriamiento: 0.10,       // tras rodar, espera mínima para volver a rodar
  },
  curacion: {
    cargas: 3,
    cantidad: 40,             // vida que recupera
    duracion: 0.9,            // tiempo hasta que la cura se aplica (eres vulnerable mientras tanto)
    multVelocidad: 0.35,      // velocidad mientras te curas
    seCancelaAlRecibirGolpe: true, // si te golpean antes de terminar, pierdes la carga
  },
  golpeRecibido: {
    aturdimiento: 0.18,       // tiempo sin control tras recibir daño
    invulnerabilidad: 0.5,    // invulnerabilidad tras recibir daño (evita golpes dobles)
    empuje: 280,              // velocidad inicial del retroceso
  },
};
