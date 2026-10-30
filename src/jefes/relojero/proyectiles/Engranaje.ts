import { Proyectil } from '../../../entidades/Proyectil.ts';
import type { Juego } from '../../../nucleo/Juego.ts';
import { CONFIG_RELOJERO as C } from '../config.ts';
import { dibujarSprite } from '../../../nucleo/dibujo.ts';
import { dibujarEngranajeForma } from '../dibujo.ts';

/**
 * Rueda dentada que viaja en línea recta hasta chocar con un muro o con el jugador.
 * Asset opcional: "relojero.engranaje".
 */
export class Engranaje extends Proyectil {
  private readonly vx: number;
  private readonly vy: number;
  private rot = 0;

  constructor(juego: Juego, private x: number, private y: number, angulo: number) {
    super(juego, 'cuerpo');
    const E = C.engranaje;
    this.vx = Math.cos(angulo) * E.velocidad;
    this.vy = Math.sin(angulo) * E.velocidad;
  }

  actualizar(dt: number): void {
    const E = C.engranaje, p = this.juego.jugador;
    this.x += this.vx * dt; this.y += this.vy * dt; this.rot += 10 * dt;
    if (Math.hypot(p.x - this.x, p.y - this.y) < E.radio + p.r) {
      // el retroceso empuja en la dirección del vuelo
      if (this.juego.golpearJugador(E.danio, this.x - this.vx, this.y - this.vy)) this.destruir();
    }
    if (this.juego.arena.tocaMuro(this.x, this.y, E.radio)) {
      this.destruir();
      this.juego.chispas(this.x, this.y, '#ff9f1c', 8, 160);
    }
  }

  dibujar(ctx: CanvasRenderingContext2D): void {
    const r = C.engranaje.radio;
    const sprite = this.juego.assets.imagen('relojero.engranaje');
    if (sprite) dibujarSprite(ctx, sprite, this.x, this.y, r * 2, r * 2, this.rot);
    else dibujarEngranajeForma(ctx, this.x, this.y, r, this.rot);
  }
}
