import { TAU, clamp, type Circulo } from './utilidades.ts';
import type { ServicioAssets } from './GestorAssets.ts';

/**
 * Arena rectangular cerrada.
 * Asset opcional: "arena.suelo" (imagen del suelo interior, se estira a 888x568).
 */
export class Arena {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;

  constructor(
    configArena: { margen: number },
    configLienzo: { ancho: number; alto: number },
    private readonly assets: ServicioAssets,
  ) {
    const m = configArena.margen;
    this.x0 = m; this.y0 = m;
    this.x1 = configLienzo.ancho - m; this.y1 = configLienzo.alto - m;
  }

  get ancho(): number { return this.x1 - this.x0; }
  get alto(): number { return this.y1 - this.y0; }
  get cx(): number { return (this.x0 + this.x1) / 2; }
  get cy(): number { return (this.y0 + this.y1) / 2; }

  /** Mantiene un círculo dentro de los muros. */
  contener(e: Circulo): void {
    e.x = clamp(e.x, this.x0 + e.r, this.x1 - e.r);
    e.y = clamp(e.y, this.y0 + e.r, this.y1 - e.r);
  }

  /** ¿Un círculo de radio r en (x, y) toca o cruza un muro? */
  tocaMuro(x: number, y: number, r: number): boolean {
    return x < this.x0 + r || x > this.x1 - r || y < this.y0 + r || y > this.y1 - r;
  }

  dibujar(ctx: CanvasRenderingContext2D): void {
    const { x0, y0, ancho: w, alto: h } = this;
    // muro
    ctx.fillStyle = '#2b2419';
    ctx.fillRect(x0 - 14, y0 - 14, w + 28, h + 28);

    const suelo = this.assets.imagen('arena.suelo');
    if (suelo) {
      ctx.drawImage(suelo, x0, y0, w, h);
    } else {
      ctx.fillStyle = '#181d28';
      ctx.fillRect(x0, y0, w, h);
      // baldosas
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = x0 + 48; x < this.x1; x += 48) { ctx.moveTo(x, y0); ctx.lineTo(x, this.y1); }
      for (let y = y0 + 48; y < this.y1; y += 48) { ctx.moveTo(x0, y); ctx.lineTo(this.x1, y); }
      ctx.stroke();
      // esfera grabada en el suelo
      const R = Math.min(w, h) * 0.44;
      ctx.strokeStyle = 'rgba(242,193,78,0.06)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, R, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const an = i * TAU / 12;
        ctx.beginPath();
        ctx.moveTo(this.cx + Math.cos(an) * R * 0.9, this.cy + Math.sin(an) * R * 0.9);
        ctx.lineTo(this.cx + Math.cos(an) * R, this.cy + Math.sin(an) * R);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#6b5639'; ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, w, h);
  }
}
