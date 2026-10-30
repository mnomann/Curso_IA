/**
 * Preferencias del jugador guardadas en este navegador (localStorage).
 * Si el navegador no permite guardar (modo privado, cookies bloqueadas),
 * el juego funciona igual con los valores por defecto.
 */
const CLAVE = 'relojero-sin-hora.preferencias';

/** Lo mínimo de Storage que se usa (permite pasar un almacén de prueba). */
export type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export class Preferencias<T extends Record<string, number | string | boolean>> {
  private readonly valores: T;

  /**
   * @param porDefecto valores iniciales, ej: { musica: 67, efectos: 100 }
   * @param almacen    normalmente window.localStorage
   */
  constructor(porDefecto: T, private readonly almacen: Almacen | null) {
    this.valores = { ...porDefecto };
    try {
      const guardado: unknown = almacen ? JSON.parse(almacen.getItem(CLAVE) || 'null') : null;
      if (guardado && typeof guardado === 'object') {
        const g = guardado as Record<string, unknown>;
        for (const k of Object.keys(porDefecto) as (keyof T & string)[]) {
          if (typeof g[k] === typeof porDefecto[k]) this.valores[k] = g[k] as T[typeof k];
        }
      }
    } catch { /* datos corruptos o almacenamiento bloqueado: se usan los valores por defecto */ }
  }

  get<K extends keyof T>(clave: K): T[K] { return this.valores[clave]; }

  set<K extends keyof T>(clave: K, valor: T[K]): void {
    this.valores[clave] = valor;
    try { this.almacen?.setItem(CLAVE, JSON.stringify(this.valores)); } catch { /* sin almacenamiento */ }
  }
}

/**
 * Los deslizadores van de 0 a 100, pero el oído no percibe el volumen en forma lineal:
 * con una curva cuadrática, el 50% del deslizador "suena" a la mitad.
 */
export const deslizadorAGanancia = (v: number): number => (Math.max(0, Math.min(100, v)) / 100) ** 2;
export const gananciaADeslizador = (g: number): number => Math.round(Math.sqrt(Math.max(0, Math.min(1, g))) * 100);
