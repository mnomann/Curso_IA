/**
 * Registro de jefes: lo único que el menú y el núcleo saben de los jefes.
 * Cada entrada aparece como una tarjeta en el menú principal.
 */
import type { Juego } from '../nucleo/Juego.ts';
import type { Jefe } from './Jefe.ts';
import type { ClaveSonido } from '../config/manifiesto.ts';
import { Relojero } from './relojero/Relojero.ts';
import { analizarRelojero, type ResultadoAnalisis } from './relojero/analisis.ts';

export interface DefJefe {
  id: string;
  nombre: string;
  descripcion: string;
  crear: (juego: Juego) => Jefe;
  /** Opcional: chequeo numérico que se imprime en la consola al cargar. */
  analizar?: () => ResultadoAnalisis;
  /** Clave de la música de su pelea (si no está lista, silencio). */
  musica?: ClaveSonido;
}

export const JEFES: readonly DefJefe[] = [
  {
    id: 'relojero',
    nombre: 'El Relojero Sin Hora',
    descripcion: 'Guardián de una torre cuyo reloj se detuvo. Ataca a compás: aprende su ritmo.',
    crear: (juego) => new Relojero(juego),
    analizar: analizarRelojero,
    musica: 'musica.relojero',
  },
];
