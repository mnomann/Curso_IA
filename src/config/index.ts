/* ==========================================================================
   CONFIG unificado. Cada parte vive en su propio archivo para que sea fácil
   de encontrar, pero aquí se juntan en un solo objeto CONFIG.
     - Generales ............ src/config/juego.ts
     - Jugador .............. src/config/jugador.ts
     - Jefe ................. src/jefes/relojero/config.ts
     - Assets (sprites, sonidos, música) ... src/config/manifiesto.ts
   ========================================================================== */
import { CONFIG_JUEGO } from './juego.ts';
import { CONFIG_JUGADOR } from './jugador.ts';
import { CONFIG_RELOJERO } from '../jefes/relojero/config.ts';

export const CONFIG = {
  ...CONFIG_JUEGO,
  jugador: CONFIG_JUGADOR,
  jefes: {
    relojero: CONFIG_RELOJERO,
  },
};

export type Config = typeof CONFIG;
