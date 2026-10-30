import { TAU, rand, clamp } from './utilidades.ts';

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; max: number; color: string; r: number }

/** Chispas simples para impactos, curaciones y cambios de fase. */
export class SistemaParticulas {
  private lista: Particula[] = [];

  emitir(x: number, y: number, color: string, cantidad: number, velocidad = 180): void {
    for (let i = 0; i < cantidad; i++) {
      const a = Math.random() * TAU, v = rand(0.3, 1) * velocidad, vida = rand(0.25, 0.55);
      this.lista.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida, max: vida, color, r: rand(1.5, 3.5) });
    }
  }

  actualizar(dt: number): void {
    for (const q of this.lista) {
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.9; q.vy *= 0.9;
      q.vida -= dt;
    }
    this.lista = this.lista.filter((q) => q.vida > 0);
  }

  dibujar(ctx: CanvasRenderingContext2D): void {
    for (const q of this.lista) {
      ctx.globalAlpha = clamp(q.vida / q.max, 0, 1);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  limpiar(): void { this.lista = []; }
}
