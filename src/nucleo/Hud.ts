import { CONFIG } from '../config/index.ts';
import { TAU, clamp } from './utilidades.ts';
import { dibujarBarra, dibujarSprite } from './dibujo.ts';
import type { Juego } from './Juego.ts';

/**
 * Interfaz sobre el juego: barras del jugador, cargas de curación,
 * barra del jefe, título inicial y anuncios.
 * Assets opcionales: "ui.frasco" y "ui.frascoVacio".
 */
export class Hud {
  constructor(private readonly juego: Juego) {}

  dibujar(ctx: CanvasRenderingContext2D): void {
    const { jugador: p, jefe: j, assets } = this.juego;
    const C = CONFIG.jugador, L = CONFIG.lienzo, fuente = CONFIG.ui.fuente;

    // ---- jugador
    dibujarBarra(ctx, 20, 16, 260, 14, p.vida / C.vidaMax, p.vidaMostrada / C.vidaMax, '#e5484d');
    const sinEstamina = p.estamina < C.ataque.costo;
    dibujarBarra(ctx, 20, 36, 200, 8, p.estamina / C.estaminaMax, 0, sinEstamina ? '#2f8a4e' : '#3ecf6e');
    const frasco = assets.imagen('ui.frasco'), frascoVacio = assets.imagen('ui.frascoVacio');
    for (let i = 0; i < C.curacion.cargas; i++) {
      const x = 28 + i * 22, y = 60, llena = i < p.cargas;
      if (frasco) {
        // sin sprite de frasco vacío, se usa el lleno semitransparente
        ctx.save();
        if (!llena && !frascoVacio) ctx.globalAlpha = 0.3;
        dibujarSprite(ctx, llena ? frasco : (frascoVacio ?? frasco), x, y, 18, 18);
        ctx.restore();
      } else {
        ctx.fillStyle = llena ? '#5be37d' : '#26262b';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }

    // ---- jefe
    const w = 620, x = (L.ancho - w) / 2, y = L.alto - 26;
    ctx.font = `600 15px ${fuente}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ece8dc';
    ctx.fillText(j.nombre, x, y - 6);
    dibujarBarra(ctx, x, y, w, 10, j.vida / j.vidaMax, this.juego.vidaJefeMostrada / j.vidaMax, j.invulnerable ? '#8b91a1' : '#c23b3b');
    for (const u of j.umbralesFase) {
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + w * u - 1, y - 3, 2, 16);
    }

    // ---- título del jefe al empezar
    const T = CONFIG.pantalla.duracionTituloJefe, t = this.juego.tiempo;
    if (t < T) {
      const f = t < 0.3 ? t / 0.3 : clamp((T - t) / 0.6, 0, 1);
      this.textoCentrado(ctx, j.nombre.toUpperCase(), L.ancho / 2, L.alto * 0.62, `800 34px ${fuente}`, '#f2c14e', f);
    }
    // ---- anuncios
    const an = this.juego.anuncio;
    if (an) {
      const D = CONFIG.pantalla.duracionAnuncio;
      this.textoCentrado(ctx, an.texto, L.ancho / 2, 90, `700 26px ${fuente}`, '#ffd166', clamp(Math.min(an.t / 0.2, (D - an.t) / 0.5), 0, 1));
    }
  }

  private textoCentrado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, font: string, color: string, alfa: number): void {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.font = font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(texto, x + 2, y + 2);
    ctx.fillStyle = color; ctx.fillText(texto, x, y);
    ctx.restore();
  }
}
