// Formas propias del Relojero. Las cuñas de aviso son SIEMPRE geométricas:
// son información de juego y deben leerse igual con o sin arte final.
import { TAU } from '../../nucleo/utilidades.ts';
import { dibujarSprite } from '../../nucleo/dibujo.ts';

export function dibujarCuna(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, largo: number,
  desde: number, hasta: number, sentido: number, rgb: string, alfaRelleno: number, alfaBorde: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, largo, desde, hasta, sentido < 0);
  ctx.closePath();
  ctx.fillStyle = `rgba(${rgb},${alfaRelleno})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${alfaBorde})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Aguja que gira desde el centro. Con sprite: la imagen apunta a la DERECHA,
 * el pivote está en su borde izquierdo y se estira al largo actual.
 */
export function dibujarAguja(
  ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, largo: number, grosor: number,
  color: string, colorPunta: string | null, sprite: CanvasImageSource | null = null,
): void {
  if (sprite) {
    dibujarSprite(ctx, sprite, x, y, largo, Math.max(grosor * 1.8, 10), ang, 0, 0.5);
    return;
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = grosor;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
  ctx.stroke();
  if (colorPunta) {
    ctx.strokeStyle = colorPunta;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * largo * 0.8, y + Math.sin(ang) * largo * 0.8);
    ctx.lineTo(x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
    ctx.stroke();
  }
  ctx.restore();
}

export function dibujarEngranajeForma(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  const dientes = 8;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#ff9f1c'; ctx.strokeStyle = '#3a1d00'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < dientes * 2; i++) {
    const a = i * Math.PI / dientes;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const a1 = a - Math.PI / dientes / 2, a2 = a + Math.PI / dientes / 2;
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
    ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a1d00';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill();
  ctx.restore();
}
