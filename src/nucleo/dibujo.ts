// Ayudas de dibujo compartidas por todo el juego.

/**
 * Dibuja una imagen centrada en un pivote, rotada.
 * pivoteX/pivoteY van de 0 a 1 dentro de la imagen (0.5, 0.5 = centro).
 */
export function dibujarSprite(
  ctx: CanvasRenderingContext2D, img: CanvasImageSource,
  x: number, y: number, ancho: number, alto: number,
  angulo = 0, pivoteX = 0.5, pivoteY = 0.5,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (angulo) ctx.rotate(angulo);
  ctx.drawImage(img, -ancho * pivoteX, -alto * pivoteY, ancho, alto);
  ctx.restore();
}

/** Barra de vida/estamina con "rastro" blanco del daño reciente. */
export function dibujarBarra(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  frac: number, fracRastro: number, color: string, fondo = '#26262b',
): void {
  const c = (v: number) => Math.max(0, Math.min(1, v));
  ctx.fillStyle = '#000000'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = fondo; ctx.fillRect(x, y, w, h);
  if (fracRastro > frac) { ctx.fillStyle = '#f5f1e6'; ctx.fillRect(x, y, w * c(fracRastro), h); }
  ctx.fillStyle = color; ctx.fillRect(x, y, w * c(frac), h);
}
