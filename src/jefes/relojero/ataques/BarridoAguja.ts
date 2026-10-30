import { Ataque } from '../../Ataque.ts';
import type { Relojero } from '../Relojero.ts';
import type { Jugador } from '../../../entidades/Jugador.ts';
import { CONFIG_RELOJERO as C } from '../config.ts';
import { TAU, DEG, angDiff } from '../../../nucleo/utilidades.ts';
import { dibujarCuna } from '../dibujo.ts';

interface Aguja {
  largo: number;
  inicio: number;
  /** +1 horario, -1 antihorario */
  sentido: 1 | -1;
  /** Ángulo en el paso anterior (para el chequeo sin "túnel"). */
  previo: number;
  color: string;
}

/**
 * Barrido de aguja: la aguja larga barre ~270° centrados en el jugador.
 * Aviso: la cuña exacta en rojo translúcido.
 * Fase 2: la aguja corta barre a la vez en sentido opuesto, centrada en el
 * lado contrario. Juntas cubren todo el círculo interior; el hueco seguro
 * queda detrás del jefe, entre el radio corto y el largo.
 */
export class BarridoAguja extends Ataque<Relojero> {
  readonly nombre = 'BarridoAguja';
  private readonly arco: number;
  private readonly agujas: Aguja[];
  private etapa: 'aviso' | 'barrido' = 'aviso';

  constructor(jefe: Relojero) {
    super(jefe);
    const B = C.barrido;
    const ang = jefe.anguloAlJugador();
    const sentido: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    this.arco = B.arco * DEG;
    this.agujas = [
      { largo: B.largoAguja, inicio: ang - sentido * this.arco / 2, sentido, previo: 0, color: '255,45,45' },
    ];
    if (jefe.fase === 2) {
      this.agujas.push({
        largo: B.largoAguja * B.ratioAgujaCortaFase2,
        inicio: ang + Math.PI + sentido * this.arco / 2,
        sentido: sentido === 1 ? -1 : 1, previo: 0, color: '255,150,20',
      });
    }
    this.juego.assets.sonar('relojero.avisoBarrido');
  }

  get recuperacion(): number { return C.barrido.recuperacion; }

  override actualizar(dt: number): void {
    super.actualizar(dt);
    const j = this.jefe, B = C.barrido;
    j.agujasEstiradas = true;
    const [larga, corta] = this.agujas;
    if (!larga) return;

    if (this.etapa === 'aviso') {
      // las agujas giran rápido hasta su ángulo de inicio (refuerza el aviso)
      const k = 1 - Math.exp(-18 * dt);
      j.angLarga += angDiff(larga.inicio, j.angLarga) * k;
      if (corta) j.angCorta += angDiff(corta.inicio, j.angCorta) * k;
      if (this.t >= B.aviso) {
        for (const g of this.agujas) g.previo = g.inicio;
        this.etapa = 'barrido';
        this.t = 0;
        this.juego.assets.sonar('relojero.barrido');
      }
      return;
    }

    const prog = Math.min(1, this.t / B.duracion);
    const p = this.juego.jugador;
    this.agujas.forEach((g, i) => {
      const ang = g.inicio + g.sentido * this.arco * prog;
      if (agujaGolpea(j, p, g.previo, ang, g.largo, B.grosorAguja)) this.juego.golpearJugador(B.danio, j.x, j.y);
      g.previo = ang;
      if (i === 0) j.angLarga = ang; else j.angCorta = ang;
    });
    if (prog >= 1) this.terminar();
  }

  override dibujarSuelo(ctx: CanvasRenderingContext2D): void {
    const j = this.jefe, aviso = this.etapa === 'aviso';
    const pulso = 0.5 + 0.5 * Math.sin(this.t * TAU * 5);
    for (const g of this.agujas) {
      const fin = g.inicio + g.sentido * this.arco;
      const desde = aviso ? g.inicio : g.previo;
      dibujarCuna(ctx, j.x, j.y, g.largo, desde, fin, g.sentido, g.color, aviso ? 0.22 + 0.13 * pulso : 0.12, aviso ? 0.9 : 0.4);
      if (!aviso) continue;
      ctx.save();
      // borde de inicio grueso: ahí arranca la aguja
      ctx.strokeStyle = `rgba(${g.color},0.95)`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(j.x, j.y);
      ctx.lineTo(j.x + Math.cos(g.inicio) * g.largo, j.y + Math.sin(g.inicio) * g.largo);
      ctx.stroke();
      // flecha de sentido en el medio del arco
      const mid = g.inicio + g.sentido * this.arco / 2, rr = g.largo + 12;
      const ax = j.x + Math.cos(mid) * rr, ay = j.y + Math.sin(mid) * rr;
      const tang = mid + g.sentido * Math.PI / 2;
      ctx.fillStyle = `rgba(${g.color},0.95)`;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(tang) * 10, ay + Math.sin(tang) * 10);
      ctx.lineTo(ax + Math.cos(tang + 2.5) * 8, ay + Math.sin(tang + 2.5) * 8);
      ctx.lineTo(ax + Math.cos(tang - 2.5) * 8, ay + Math.sin(tang - 2.5) * 8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

/** ¿Golpea una aguja que barrió de a0 a a1 en este paso? Chequeo por intervalo angular: sin "túnel". */
export function agujaGolpea(
  jefe: { x: number; y: number }, p: Pick<Jugador, 'x' | 'y' | 'r'>,
  a0: number, a1: number, largo: number, grosor: number,
): boolean {
  const dx = p.x - jefe.x, dy = p.y - jefe.y, d = Math.hypot(dx, dy);
  if (d - p.r > largo) return false;
  if (d <= p.r + grosor / 2) return true;
  const th = Math.atan2(dy, dx);
  const tol = Math.asin(Math.min(1, (p.r + grosor / 2) / d));
  const mid = a0 + (a1 - a0) / 2, half = Math.abs(a1 - a0) / 2;
  return Math.abs(angDiff(th, mid)) <= half + tol;
}
