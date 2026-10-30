import { Ataque } from '../../Ataque.ts';
import type { Relojero } from '../Relojero.ts';
import { CONFIG_RELOJERO as C } from '../config.ts';
import { clamp, lerp, easeOut, randInt } from '../../../nucleo/utilidades.ts';
import { Anillo } from '../proyectiles/Anillo.ts';

/**
 * Campanada: 2-3 pulsos (siempre 3 en fase 2). Antes de CADA pulso la esfera
 * se encoge y brilla durante "aviso". Tras el último, el jefe queda "dando
 * cuerda" (ventana de castigo).
 */
export class Campanada extends Ataque<Relojero> {
  readonly nombre = 'Campanada';
  private restantes: number;

  constructor(jefe: Relojero) {
    super(jefe);
    const A = C.campanada;
    this.restantes = jefe.fase === 2 ? C.fase2.pulsosCampanada : randInt(A.pulsosMin, A.pulsosMax);
  }

  get recuperacion(): number { return C.campanada.darCuerda; }

  override actualizar(dt: number): void {
    super.actualizar(dt);
    const j = this.jefe, A = C.campanada;
    const k = clamp(this.t / A.aviso, 0, 1);
    j.controlEsfera = true; // el jefe no debe relajar escala/brillo mientras avisamos
    // se suaviza hacia el objetivo para que se vea el "rebote" tras cada pulso
    j.escala = lerp(j.escala, 1 - A.encogimiento * easeOut(k), 1 - Math.exp(-25 * dt));
    j.brillo = k; // arranca en 0 en cada aviso: siempre se lee igual

    if (this.t >= A.aviso) {
      const vel = A.velocidad * (j.fase === 2 ? C.fase2.multVelocidadAnillo : 1);
      j.agregarProyectil(new Anillo(this.juego, j.x, j.y, j.r, vel));
      j.escala = 1.14; j.brillo = 0; j.destello = 0.15;
      this.juego.chispas(j.x, j.y - j.r, '#ffe066', 6, 120);
      this.juego.assets.sonar('relojero.campanada');
      this.restantes--;
      if (this.restantes > 0) this.t = 0;
      else this.terminar();
    }
  }

  override alTerminar(): void { this.jefe.dandoCuerda = true; }
}
