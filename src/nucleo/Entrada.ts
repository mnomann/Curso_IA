/**
 * Teclado: teclas mantenidas (movimiento) y un búfer corto para acciones
 * (atacar, rodar, curar), para que una pulsación un poco temprana no se pierda.
 */
export type Accion = 'atacar' | 'rodar' | 'curar';

export interface GanchosEntrada {
  estaJugando: () => boolean;
  alPausar: () => void;
  alDepurar: () => void;
}

export interface Vector { x: number; y: number }

const ACCIONES: Readonly<Record<string, Accion>> = { KeyJ: 'atacar', Space: 'rodar', KeyE: 'curar' };
const TECLAS_SIN_SCROLL = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export class Entrada {
  readonly teclas = new Set<string>();
  readonly buffer: Record<Accion, number> = { atacar: 0, rodar: 0, curar: 0 };

  /** @param duracionBuffer segundos que se recuerda una acción pulsada */
  constructor(private readonly duracionBuffer: number, private readonly ganchos: GanchosEntrada) {}

  escuchar(objetivo: Window): void {
    objetivo.addEventListener('keydown', (e) => this.alPresionar(e));
    objetivo.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    objetivo.addEventListener('blur', () => {
      this.limpiar();
      if (this.ganchos.estaJugando()) this.ganchos.alPausar();
    });
  }

  private alPresionar(e: KeyboardEvent): void {
    const jugando = this.ganchos.estaJugando();
    // evita que Espacio y las flechas hagan scroll en la página durante la pelea
    if (jugando && TECLAS_SIN_SCROLL.includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') { if (!e.repeat) this.ganchos.alPausar(); return; }
    if (e.code === 'KeyH') { if (!e.repeat) this.ganchos.alDepurar(); return; }
    this.teclas.add(e.code);
    const accion = ACCIONES[e.code];
    if (accion && !e.repeat && jugando) this.buffer[accion] = this.duracionBuffer;
  }

  /** Para pruebas: simula que el jugador pulsó una acción. */
  pulsar(accion: Accion): void { this.buffer[accion] = this.duracionBuffer; }

  tick(dt: number): void {
    for (const k of Object.keys(this.buffer) as Accion[]) this.buffer[k] = Math.max(0, this.buffer[k] - dt);
  }
  hay(accion: Accion): boolean { return this.buffer[accion] > 0; }
  consumir(accion: Accion): void { this.buffer[accion] = 0; }
  limpiar(): void {
    this.teclas.clear();
    for (const k of Object.keys(this.buffer) as Accion[]) this.buffer[k] = 0;
  }

  /** Vector de movimiento normalizado según WASD / flechas. */
  movimiento(): Vector {
    const t = this.teclas;
    let x = 0, y = 0;
    if (t.has('KeyW') || t.has('ArrowUp')) y -= 1;
    if (t.has('KeyS') || t.has('ArrowDown')) y += 1;
    if (t.has('KeyA') || t.has('ArrowLeft')) x -= 1;
    if (t.has('KeyD') || t.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y);
    return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
}
