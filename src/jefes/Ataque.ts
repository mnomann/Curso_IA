import type { Jefe } from './Jefe.ts';
import type { Juego } from '../nucleo/Juego.ts';

/**
 * Clase base de un ataque de jefe (aviso + ejecución).
 *
 * El jefe crea el ataque, llama actualizar(dt) cada paso hasta que
 * terminado sea true, y luego queda inmóvil "recuperacion" segundos
 * (la ventana de castigo). Así cada ataque vive en su propio archivo y
 * agregar uno nuevo no obliga a tocar la máquina de estados del jefe.
 *
 * J es el tipo concreto del jefe, para que el ataque pueda usar sus
 * propiedades (por ejemplo, las agujas del Relojero) con tipos revisados.
 */
export abstract class Ataque<J extends Jefe = Jefe> {
  protected readonly juego: Juego;
  t = 0;
  terminado = false;

  constructor(protected readonly jefe: J) {
    this.juego = jefe.juego;
  }

  /** Nombre para depuración. Explícito porque al compilar se acortan los nombres de las clases. */
  abstract readonly nombre: string;

  /** Segundos que el jefe queda inmóvil al terminar (0 = sin ventana de castigo). */
  abstract get recuperacion(): number;

  /** Las subclases deben llamar a super.actualizar(dt) al principio. */
  actualizar(dt: number): void { this.t += dt; }

  /** Avisos que van bajo el jugador (cuñas, líneas, zonas). */
  dibujarSuelo(_ctx: CanvasRenderingContext2D): void {}

  /** Efectos que van encima de todo. */
  dibujarCuerpo(_ctx: CanvasRenderingContext2D): void {}

  /** Lo llama el jefe justo después de que el ataque termina. */
  alTerminar(): void {}

  protected terminar(): void { this.terminado = true; }
}
