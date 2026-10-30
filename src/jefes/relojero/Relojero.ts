import { Jefe } from '../Jefe.ts';
import type { Ataque } from '../Ataque.ts';
import type { Juego } from '../../nucleo/Juego.ts';
import type { Capa } from '../../entidades/Proyectil.ts';
import { CONFIG_RELOJERO as C, type NombreAtaque } from './config.ts';
import { BarridoAguja } from './ataques/BarridoAguja.ts';
import { Campanada } from './ataques/Campanada.ts';
import { LanzarEngranaje } from './ataques/LanzarEngranaje.ts';
import { analizarRelojero } from './analisis.ts';
import { dibujarAguja } from './dibujo.ts';
import { TAU, clamp, lerp, rand, elegirPonderado } from '../../nucleo/utilidades.ts';
import { dibujarSprite } from '../../nucleo/dibujo.ts';

/**
 * Nombre del ataque (como en config.pesos) -> clase.
 * Para sumar un ataque: agrégalo aquí y en los pesos del config
 * (TypeScript avisa si falta en cualquiera de los dos).
 */
const ATAQUES: Record<NombreAtaque, new (jefe: Relojero) => Ataque<Relojero>> = {
  barrido: BarridoAguja,
  campanada: Campanada,
  engranaje: LanzarEngranaje,
};

export type EstadoRelojero = 'pausa' | 'atacando' | 'recuperacion' | 'transicion' | 'muerto';

/**
 * El Relojero Sin Hora.
 * Estados: pausa -> atacando -> recuperacion -> pausa ...  (+ transicion, muerto)
 *
 * Assets opcionales (src/config/manifiesto.ts):
 *   relojero.esfera, relojero.esferaFase2, relojero.agujaLarga, relojero.agujaCorta,
 *   relojero.llave, relojero.engranaje
 */
export class Relojero extends Jefe {
  declare estado: EstadoRelojero;
  ataque: Ataque<Relojero> | null = null;
  readonly historial: NombreAtaque[] = [];
  private tMuerte = 0;
  private analisis: string[] | null = null;

  // ---- estado visual (los ataques también lo modifican)
  parpadeo = 0;
  escala = 1;
  brillo = 0;
  destello = 0;
  angLarga = -Math.PI / 2;
  angCorta = -Math.PI / 2 + 2.2;
  largoLargaVis: number;
  largoCortaVis: number;
  /** Lo pone en true el barrido en cada paso: las agujas se estiran a su largo de ataque. */
  agujasEstiradas = false;
  /** Lo pone en true la campanada en cada paso: ella controla la escala y el brillo de la esfera. */
  controlEsfera = false;
  dandoCuerda = false;

  constructor(juego: Juego) {
    super(juego, C);
    const a = juego.arena;
    this.x = a.cx;
    this.y = a.y0 + a.alto * 0.36;
    this.largoLargaVis = this.r * 0.82;
    this.largoCortaVis = this.r * 0.55;
    this.entrar('pausa', C.pausaInicial);
  }

  override entrar(estado: EstadoRelojero, duracion = Infinity): void { super.entrar(estado, duracion); }

  // ===================================================== ayudas de ritmo
  private pausaAleatoria(): number {
    const [mn, mx] = C.pausaEntreAtaques;
    return rand(mn, mx) * (this.fase === 2 ? C.fase2.multPausa : 1);
  }
  private multRecuperacion(): number { return this.fase === 2 ? C.fase2.multRecuperacion : 1; }

  // ===================================================== lógica
  override actualizar(dt: number): void {
    super.actualizar(dt); // reloj del estado + proyectiles
    if (this.parpadeo > 0) this.parpadeo -= dt;
    if (this.destello > 0) this.destello -= dt;
    this.agujasEstiradas = false;
    this.controlEsfera = false;

    switch (this.estado) {
      case 'pausa':
        this.acercarse(dt);
        if (this.juego.combateActivo && this.t >= this.duracion) this.elegirAtaque();
        break;
      case 'atacando': {
        const ataque = this.ataque;
        if (!ataque) { this.entrar('pausa', this.pausaAleatoria()); break; }
        ataque.actualizar(dt);
        if (ataque.terminado) {
          const rec = ataque.recuperacion * this.multRecuperacion();
          ataque.alTerminar();
          this.ataque = null;
          this.entrar('recuperacion', rec);
        }
        break;
      }
      case 'recuperacion':
        if (this.dandoCuerda) { this.angCorta += 14 * dt; this.angLarga += 4 * dt; }
        if (this.t >= this.duracion) { this.dandoCuerda = false; this.entrar('pausa', this.pausaAleatoria()); }
        break;
      case 'transicion':
        this.angLarga += 9 * dt; this.angCorta -= 9 * dt;
        if (this.t >= this.duracion) { this.invulnerable = false; this.entrar('pausa', 0.5); }
        break;
      case 'muerto':
        this.tMuerte += dt;
        break;
    }

    // largo visible de las agujas: se estiran para el barrido y vuelven al recuperarse
    const B = C.barrido;
    const objLarga = this.agujasEstiradas ? B.largoAguja : this.r * 0.82;
    const objCorta = this.agujasEstiradas && this.fase === 2 ? B.largoAguja * B.ratioAgujaCortaFase2 : this.r * 0.55;
    const k = 1 - Math.exp(-(this.agujasEstiradas ? 14 : 5) * dt);
    this.largoLargaVis = lerp(this.largoLargaVis, objLarga, k);
    this.largoCortaVis = lerp(this.largoCortaVis, objCorta, k);
    if (!this.controlEsfera) {
      this.escala = lerp(this.escala, 1, 1 - Math.exp(-10 * dt));
      this.brillo = Math.max(0, this.brillo - dt * 4);
    }
  }

  private acercarse(dt: number): void {
    const p = this.juego.jugador, a = this.juego.arena;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    if (d <= C.distanciaPreferida) return;
    this.x += (dx / d) * C.velocidadDesplazamiento * dt;
    this.y += (dy / d) * C.velocidadDesplazamiento * dt;
    const m = this.r + 10;
    this.x = clamp(this.x, a.x0 + m, a.x1 - m);
    this.y = clamp(this.y, a.y0 + m, a.y1 - m);
  }

  private elegirAtaque(): void {
    const p = this.juego.jugador, P = C.pesos;
    const d = this.distanciaAlJugador();
    let w: Record<NombreAtaque, number>;
    if (d - p.r < C.barrido.largoAguja) w = { ...P.cerca };
    else if (d < P.limiteMedio) w = { ...P.medio };
    else w = { ...P.lejos };
    // evita repetir el mismo ataque más de maxRepeticiones veces seguidas
    const h = this.historial, n = P.maxRepeticiones, ultimo = h[h.length - 1];
    if (ultimo && h.length >= n && h.slice(-n).every((x) => x === ultimo)) w[ultimo] = 0;
    const nombre = elegirPonderado(w) ?? 'engranaje';
    h.push(nombre);
    if (h.length > 6) h.shift();
    this.ataque = new ATAQUES[nombre](this);
    this.entrar('atacando');
  }

  // ===================================================== ganchos de Jefe
  protected override alRecibirDanio(): void { this.parpadeo = C.parpadeoAlRecibirDanio; }

  protected alMorir(): void {
    this.limpiarProyectiles();
    this.ataque = null;
    this.dandoCuerda = false;
    this.entrar('muerto');
    this.juego.assets.sonar('relojero.muerte');
  }

  protected alCambiarFase(): void {
    this.limpiarProyectiles();
    this.ataque = null;
    this.dandoCuerda = false;
    this.invulnerable = true;
    this.escala = 1; this.brillo = 0;
    this.entrar('transicion', C.transicionFase);
    this.juego.anunciar('El reloj vuelve a andar');
    this.juego.chispas(this.x, this.y, '#ffd166', 40, 320);
    this.juego.assets.sonar('relojero.fase2');
  }

  override estadoDebug(): string {
    const at = this.ataque ? ` (${this.ataque.nombre})` : '';
    return `${super.estadoDebug()}${at}  historial: ${this.historial.join(',')}`;
  }

  override analisisDebug(): string[] {
    this.analisis ??= analizarRelojero().lineas;
    return this.analisis;
  }

  // ===================================================== dibujo
  dibujar(ctx: CanvasRenderingContext2D, capa: Capa): void {
    if (capa === 'suelo') {
      this.ataque?.dibujarSuelo(ctx);
      this.dibujarProyectiles(ctx, 'suelo');   // anillos
    } else {
      this.dibujarCuerpo(ctx);
      this.ataque?.dibujarCuerpo(ctx);
      this.dibujarProyectiles(ctx, 'cuerpo');  // engranajes
    }
  }

  private dibujarCuerpo(ctx: CanvasRenderingContext2D): void {
    const assets = this.juego.assets;
    const x = this.x, y = this.y;
    const muerto = this.estado === 'muerto';
    const fm = muerto ? clamp(this.tMuerte / 1.6, 0, 1) : 0;
    const r = this.r * this.escala;
    const fase2 = this.fase === 2;

    ctx.save();
    ctx.globalAlpha = 1 - fm;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x + 6, y + 10, r, r * 0.9, 0, 0, TAU); ctx.fill();

    // brillo de campanada (aviso: siempre geométrico, encima del arte)
    if (this.brillo > 0) {
      ctx.save();
      ctx.globalAlpha = (1 - fm) * clamp(this.brillo, 0, 1) * 0.55;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(x, y, r + 14 + 8 * this.brillo, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // esfera
    const spriteFase2 = assets.imagen('relojero.esferaFase2');
    const spriteEsfera = (fase2 && spriteFase2) || assets.imagen('relojero.esfera');
    if (spriteEsfera) {
      dibujarSprite(ctx, spriteEsfera, x, y, r * 2, r * 2);
      if (fase2 && !spriteFase2) {
        ctx.fillStyle = 'rgba(200,40,20,0.25)'; // tinte de fase 2 si no hay sprite propio
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = fase2 ? '#edc2a8' : '#efe4c8';
      ctx.strokeStyle = fase2 ? '#5a1a12' : '#3a2f22';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      if (fase2) {
        ctx.strokeStyle = '#5a1a12'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.15, y - r * 0.95); ctx.lineTo(x + r * 0.05, y - r * 0.55);
        ctx.lineTo(x - r * 0.1, y - r * 0.3); ctx.lineTo(x + r * 0.12, y - r * 0.1);
        ctx.stroke();
      }
    }
    if (this.brillo > 0) {
      ctx.fillStyle = `rgba(255,230,120,${clamp(this.brillo, 0, 1) * 0.5})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    // 12 marcas: parpadean al recibir daño y salen volando al morir.
    // Con sprite de esfera solo se dibujan al parpadear o morir (el arte ya trae sus marcas).
    const parp = this.parpadeo > 0 && Math.floor(this.parpadeo * 20) % 2 === 0;
    if (!spriteEsfera || parp || muerto) {
      for (let i = 0; i < 12; i++) {
        const an = i * TAU / 12 - Math.PI / 2;
        const gruesa = i % 3 === 0;
        const desp = muerto ? this.tMuerte * 120 : 0;
        const ri = spriteEsfera ? C.sprite.marcaInterior : (gruesa ? 0.72 : 0.78);
        const re = spriteEsfera ? C.sprite.marcaExterior : 0.93;
        const r1 = r * ri + desp, r2 = r * re + desp;
        ctx.strokeStyle = parp ? (i % 2 ? '#ffffff' : '#ff2e2e') : (fase2 ? '#8a1c12' : '#2b2218');
        ctx.lineWidth = spriteEsfera ? 6 : (gruesa ? 5 : 3);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1);
        ctx.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2);
        ctx.stroke();
      }
    }

    // agujas (en pausa tiemblan: un reloj detenido que intenta avanzar)
    const tic = this.estado === 'pausa' && (this.juego.tiempo % 1) < 0.08 ? 0.09 : 0;
    dibujarAguja(ctx, x, y, this.angCorta - tic, this.largoCortaVis, 6, fase2 ? '#c2410c' : '#2b2218', null, assets.imagen('relojero.agujaCorta'));
    dibujarAguja(ctx, x, y, this.angLarga + tic, this.largoLargaVis, C.barrido.grosorAguja * 0.75, '#1c1712', '#e5484d', assets.imagen('relojero.agujaLarga'));
    ctx.fillStyle = '#1c1712';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();

    // destello blanco en el instante del pulso
    if (this.destello > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${this.destello / 0.15})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke();
    }

    if (this.dandoCuerda) this.dibujarLlave(ctx, x, y - r - 18);

    // destello de transición de fase
    if (this.estado === 'transicion') {
      const f = 0.5 + 0.5 * Math.sin(this.t * TAU * 6);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * f})`;
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  private dibujarLlave(ctx: CanvasRenderingContext2D, kx: number, ky: number): void {
    const rot = this.t * 8;
    const sprite = this.juego.assets.imagen('relojero.llave');
    if (sprite) { dibujarSprite(ctx, sprite, kx, ky, 32, 32, rot); return; }
    ctx.save();
    ctx.translate(kx, ky); ctx.rotate(rot);
    ctx.fillStyle = '#f2c14e'; ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-9, 0, 7, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(9, 0, 7, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-2, -2, 4, 12);
    ctx.restore();
  }
}
