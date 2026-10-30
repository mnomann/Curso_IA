import { Proyectil } from '../../../entidades/Proyectil.ts';
import type { Juego } from '../../../nucleo/Juego.ts';
import { CONFIG_RELOJERO as C } from '../config.ts';
import { TAU, clamp } from '../../../nucleo/utilidades.ts';

/**
 * Anillo de la campanada: se expande desde el centro y se disipa en radioMaximo.
 * Golpea una sola vez. Siempre geométrico (es información de juego).
 */
export class Anillo extends Proyectil {
  r: number;
  private golpeado = false;

  constructor(juego: Juego, readonly x: number, readonly y: number, radioInicial: number, private readonly vel: number) {
    super(juego, 'suelo');
    this.r = radioInicial;
  }

  actualizar(dt: number): void {
    const A = C.campanada, p = this.juego.jugador, g = A.grosor / 2;
    const r0 = this.r;
    this.r += this.vel * dt;
    if (!this.golpeado) {
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      // banda barrida en este paso [r0-g, r+g] contra el jugador [d-pr, d+pr]
      if (d + p.r >= r0 - g && d - p.r <= this.r + g) {
        if (this.juego.golpearJugador(A.danio, this.x, this.y)) this.golpeado = true;
      }
    }
    if (this.r >= A.radioMaximo) this.destruir();
  }

  dibujar(ctx: CanvasRenderingContext2D): void {
    const A = C.campanada;
    const vida = 1 - this.r / A.radioMaximo;
    ctx.save();
    ctx.globalAlpha = clamp(vida / 0.2, 0, 1); // se desvanece en el último 20% del recorrido
    ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = A.grosor;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}
