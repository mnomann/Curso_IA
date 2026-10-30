import type { Juego } from '../nucleo/Juego.ts';
import type { Capa, Proyectil } from '../entidades/Proyectil.ts';
import type { Circulo } from '../nucleo/utilidades.ts';

/** Lo mínimo que todo jefe necesita en su config. */
export interface ConfigJefe {
  nombre: string;
  vidaMax: number;
  radio?: number;
  /** Fracciones de vida en que cambia de fase, ej: [0.5] = fase 2 a la mitad. */
  umbralesFase?: number[];
}

/**
 * ==========================================================================
 * Clase base ABSTRACTA de un jefe.
 * --------------------------------------------------------------------------
 * El núcleo (src/nucleo/Juego.ts) solo usa esta interfaz:
 *
 *   nombre, vida, vidaMax, fase, umbralesFase, invulnerable
 *   actualizar(dt)              lógica de un paso de física
 *   dibujar(ctx, capa)          capa 'suelo' (bajo el jugador) | 'cuerpo' (encima)
 *   recibirDanio(cantidad)      -> true si el daño se aplicó
 *   cambiarFase(nuevaFase)      la llama el núcleo al cruzar un umbral de vida
 *   hurtboxes()                 -> círculos donde el jugador puede golpear
 *   cuerposSolidos()            -> círculos que bloquean al jugador
 *   estadoDebug(), analisisDebug()   textos para el modo depuración (tecla H)
 *
 * Una subclase sobrescribe los "ganchos" alRecibirDanio, alMorir y alCambiarFase
 * en vez de reescribir recibirDanio/cambiarFase. TypeScript exige implementar
 * los métodos abstractos.
 *
 * Para dañar al jugador, un jefe llama this.juego.golpearJugador(danio, x, y).
 * ==========================================================================
 */
export abstract class Jefe implements Circulo {
  readonly nombre: string;
  readonly vidaMax: number;
  readonly umbralesFase: readonly number[];
  vida: number;
  fase = 1;
  invulnerable = false;
  x: number;
  y: number;
  r: number;
  estado = 'pausa';
  /** Segundos en el estado actual. */
  t = 0;
  /** Duración prevista del estado actual (Infinity = hasta que algo lo cambie). */
  duracion = 0;
  protected proyectiles: Proyectil[] = [];

  constructor(readonly juego: Juego, config: ConfigJefe) {
    this.nombre = config.nombre;
    this.vidaMax = config.vidaMax;
    this.vida = config.vidaMax;
    this.umbralesFase = config.umbralesFase ?? [];
    this.x = juego.arena.cx;
    this.y = juego.arena.cy;
    this.r = config.radio ?? 40;
  }

  // ===================================================== interfaz común
  /** Las subclases deben llamar a super.actualizar(dt) al principio. */
  actualizar(dt: number): void {
    this.t += dt;
    this.actualizarProyectiles(dt);
  }

  /** Cada jefe dibuja su cuerpo y sus avisos; los proyectiles se dibujan con dibujarProyectiles. */
  abstract dibujar(ctx: CanvasRenderingContext2D, capa: Capa): void;

  recibirDanio(cantidad: number): boolean {
    if (this.invulnerable || this.vida <= 0) return false;
    this.vida = Math.max(0, this.vida - cantidad);
    this.alRecibirDanio(cantidad);
    if (this.vida <= 0) this.alMorir();
    return true;
  }

  cambiarFase(nueva: number): void {
    const anterior = this.fase;
    this.fase = nueva;
    this.alCambiarFase(nueva, anterior);
  }

  hurtboxes(): Circulo[] { return this.vida > 0 ? [{ x: this.x, y: this.y, r: this.r }] : []; }
  cuerposSolidos(): Circulo[] { return this.hurtboxes(); }

  estadoDebug(): string {
    const dur = isFinite(this.duracion) ? this.duracion.toFixed(2) : '∞';
    // this.nombre y no constructor.name: al compilar, Vite acorta los nombres de las clases
    return `${this.nombre} · estado: ${this.estado}  t: ${this.t.toFixed(2)}/${dur}  fase: ${this.fase}`;
  }
  analisisDebug(): string[] { return []; }

  // ===================================================== ganchos (sobrescribir)
  protected alRecibirDanio(_cantidad: number): void {}
  protected abstract alMorir(): void;
  protected abstract alCambiarFase(nueva: number, anterior: number): void;

  // ===================================================== ayudas
  get derrotado(): boolean { return this.vida <= 0; }

  /** Cambia de estado y reinicia el reloj del estado. */
  entrar(estado: string, duracion = Infinity): void {
    this.estado = estado;
    this.t = 0;
    this.duracion = duracion;
  }

  agregarProyectil(p: Proyectil): void { this.proyectiles.push(p); }

  /** Cuántos proyectiles hay en la arena (para pruebas y depuración). */
  get cantidadProyectiles(): number { return this.proyectiles.length; }

  protected actualizarProyectiles(dt: number): void {
    for (const p of this.proyectiles) p.actualizar(dt);
    this.proyectiles = this.proyectiles.filter((p) => p.vivo);
  }

  protected dibujarProyectiles(ctx: CanvasRenderingContext2D, capa: Capa): void {
    for (const p of this.proyectiles) if (p.capa === capa) p.dibujar(ctx);
  }

  protected limpiarProyectiles(): void { this.proyectiles = []; }

  distanciaAlJugador(): number {
    const p = this.juego.jugador;
    return Math.hypot(p.x - this.x, p.y - this.y);
  }

  anguloAlJugador(): number {
    const p = this.juego.jugador;
    return Math.atan2(p.y - this.y, p.x - this.x);
  }
}
