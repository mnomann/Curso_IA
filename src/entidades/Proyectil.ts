import type { Juego } from '../nucleo/Juego.ts';

export type Capa = 'suelo' | 'cuerpo';

/**
 * Clase base de todo lo que el jefe lanza o deja en la arena.
 * El jefe guarda sus proyectiles en this.proyectiles y la clase Jefe
 * se encarga de actualizarlos, dibujarlos en su capa y borrar los muertos.
 */
export abstract class Proyectil {
  vivo = true;

  /** @param capa 'suelo' = bajo el jugador, 'cuerpo' = encima */
  constructor(protected readonly juego: Juego, readonly capa: Capa = 'cuerpo') {}

  abstract actualizar(dt: number): void;
  abstract dibujar(ctx: CanvasRenderingContext2D): void;

  destruir(): void { this.vivo = false; }
}
