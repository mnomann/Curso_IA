// Funciones matemáticas pequeñas que usa todo el juego.
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1));
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** Un círculo en la arena: hitboxes, cuerpos sólidos, el jugador. */
export interface Circulo { x: number; y: number; r: number }

/** Diferencia entre dos ángulos, normalizada a (-π, π]. */
export function angDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return d;
}

/** Elige una clave de { clave: peso } al azar, proporcional al peso. */
export function elegirPonderado<K extends string>(pesos: Record<K, number>): K | null {
  const claves = Object.keys(pesos) as K[];
  let total = 0;
  for (const k of claves) total += Math.max(0, pesos[k]);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const k of claves) { r -= Math.max(0, pesos[k]); if (r <= 0) return k; }
  return claves[0] ?? null;
}
