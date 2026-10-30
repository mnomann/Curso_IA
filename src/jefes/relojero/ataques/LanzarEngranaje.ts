import { Ataque } from '../../Ataque.ts';
import type { Relojero } from '../Relojero.ts';
import { CONFIG_RELOJERO as C } from '../config.ts';
import { Engranaje } from '../proyectiles/Engranaje.ts';

/**
 * Engranaje lanzado: una línea punteada sigue al jugador, se fija
 * "aviso" segundos antes del disparo y sale una rueda dentada en línea recta.
 * Se esquiva moviéndose en perpendicular; sirve para presionar a distancia.
 */
export class LanzarEngranaje extends Ataque<Relojero> {
  readonly nombre = 'LanzarEngranaje';
  private ang: number;
  private fijado = false;

  constructor(jefe: Relojero) {
    super(jefe);
    this.ang = jefe.anguloAlJugador();
  }

  get recuperacion(): number { return C.engranaje.recuperacion; }

  override actualizar(dt: number): void {
    super.actualizar(dt);
    const E = C.engranaje, j = this.jefe;
    if (this.t < E.seguimiento) {
      this.ang = j.anguloAlJugador();
    } else if (!this.fijado) {
      this.fijado = true;
      this.juego.assets.sonar('relojero.engranajeFijado');
    }
    if (this.t >= E.seguimiento + E.aviso) {
      const dist = j.r + E.radio + 2;
      j.agregarProyectil(new Engranaje(this.juego, j.x + Math.cos(this.ang) * dist, j.y + Math.sin(this.ang) * dist, this.ang));
      this.juego.assets.sonar('relojero.engranajeDisparo');
      this.terminar();
    }
  }

  override dibujarSuelo(ctx: CanvasRenderingContext2D): void {
    const j = this.jefe, ar = this.juego.arena, an = this.ang;
    ctx.save();
    ctx.beginPath(); ctx.rect(ar.x0, ar.y0, ar.ancho, ar.alto); ctx.clip();
    ctx.strokeStyle = this.fijado ? 'rgba(255,60,60,0.95)' : 'rgba(255,214,90,0.75)';
    ctx.lineWidth = this.fijado ? 3 : 2;
    ctx.setLineDash(this.fijado ? [10, 8] : [5, 9]);
    ctx.lineDashOffset = this.fijado ? -this.t * 60 : 0;
    ctx.beginPath();
    ctx.moveTo(j.x + Math.cos(an) * j.r, j.y + Math.sin(an) * j.r);
    ctx.lineTo(j.x + Math.cos(an) * 1400, j.y + Math.sin(an) * 1400);
    ctx.stroke();
    ctx.restore();
  }
}
