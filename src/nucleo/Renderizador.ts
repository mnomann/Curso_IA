import { CONFIG } from '../config/index.ts';
import { TAU, rand } from './utilidades.ts';
import { Hud } from './Hud.ts';
import type { Juego } from './Juego.ts';

/**
 * Dibuja un frame completo en el orden de capas:
 * arena → jefe (suelo: avisos y anillos) → jugador → jefe (cuerpo) → partículas → HUD.
 * También escala el canvas a la ventana manteniendo la proporción.
 */
export class Renderizador {
  private readonly ctx: CanvasRenderingContext2D;
  private escala = 1;
  private readonly hud: Hud;

  constructor(private readonly juego: Juego, private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no soporta canvas 2D.');
    this.ctx = ctx;
    this.hud = new Hud(juego);
  }

  ajustarTamano(ventana: Window): void {
    const L = CONFIG.lienzo;
    const k = Math.min(ventana.innerWidth / L.ancho, ventana.innerHeight / L.alto);
    const marco = this.canvas.parentElement;
    if (marco) {
      marco.style.width = Math.floor(L.ancho * k) + 'px';
      marco.style.height = Math.floor(L.alto * k) + 'px';
    }
    const dpr = ventana.devicePixelRatio || 1;
    this.canvas.width = Math.round(L.ancho * k * dpr);
    this.canvas.height = Math.round(L.alto * k * dpr);
    this.escala = this.canvas.width / L.ancho;
  }

  dibujar(): void {
    const j = this.juego, ctx = this.ctx, L = CONFIG.lienzo;
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, L.ancho, L.alto);
    if (!j.enPelea) return;

    ctx.save();
    if (j.sacudida > 0 && j.estado === 'jugando') {
      const s = CONFIG.pantalla.sacudida * (j.sacudida / CONFIG.pantalla.duracionSacudida);
      ctx.translate(rand(-s, s), rand(-s, s));
    }
    j.arena.dibujar(ctx);
    j.jefe.dibujar(ctx, 'suelo');
    j.jugador.dibujar(ctx);
    j.jefe.dibujar(ctx, 'cuerpo');
    j.particulas.dibujar(ctx);
    if (j.debug) this.debugMundo(ctx);
    ctx.restore();

    this.hud.dibujar(ctx);
    if (j.debug) this.debugTexto(ctx);
  }

  private debugMundo(ctx: CanvasRenderingContext2D): void {
    const { jugador: p, jefe } = this.juego;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.invulnerable ? '#ffff00' : '#00ff88';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ff00ff';
    for (const hb of jefe.hurtboxes()) { ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  private debugTexto(ctx: CanvasRenderingContext2D): void {
    const { jugador: p, jefe } = this.juego;
    const lineas = [
      jefe.estadoDebug(),
      `jugador: ${p.estado}  invulnerable: ${p.invulnerable}  estamina: ${p.estamina.toFixed(0)}`,
      ...jefe.analisisDebug(),
    ];
    ctx.save();
    ctx.font = '12px ui-monospace, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const x = 18, y0 = 80;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 6, y0 - 4, 936, lineas.length * 15 + 8);
    lineas.forEach((l, i) => {
      ctx.fillStyle = l.startsWith('⚠') ? '#ff6b6b' : '#c8f7c5';
      ctx.fillText(l, x, y0 + i * 15);
    });
    ctx.restore();
  }
}
