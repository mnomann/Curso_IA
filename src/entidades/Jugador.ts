import { CONFIG_JUGADOR as C } from '../config/jugador.ts';
import { TAU, DEG, angDiff, type Circulo } from '../nucleo/utilidades.ts';
import { dibujarSprite } from '../nucleo/dibujo.ts';
import type { Juego } from '../nucleo/Juego.ts';

export type EstadoJugador = 'normal' | 'ataque' | 'rodada' | 'curando' | 'aturdido' | 'muerto';

/**
 * El jugador. Máquina de estados: normal | ataque | rodada | curando | aturdido | muerto
 * Asset opcional: "jugador.cuerpo" (vista desde arriba, mirando a la DERECHA).
 */
export class Jugador implements Circulo {
  x: number;
  y: number;
  readonly r = C.radio;
  vida = C.vidaMax;
  vidaMostrada = C.vidaMax;
  estamina = C.estaminaMax;
  cargas = C.curacion.cargas;
  curasUsadas = 0;
  /** Hacia dónde mira (vector unitario). */
  dirX = 0;
  dirY = -1;
  estado: EstadoJugador = 'normal';
  /** Segundos en el estado actual. */
  t = 0;

  private pausaRegen = 0;
  private invulnTras = 0;              // invulnerabilidad tras recibir un golpe
  private empX = 0;                    // retroceso
  private empY = 0;
  private rodX = 0;
  private rodY = 0;
  private enfriamientoRodada = 0;
  private golpeConectado = false;
  private estela: { x: number; y: number; v: number }[] = [];
  private tEstela = 0;

  constructor(private readonly juego: Juego, x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get muerto(): boolean { return this.estado === 'muerto'; }

  get invulnerable(): boolean {
    const R = C.rodada;
    if (this.invulnTras > 0) return true;
    return this.estado === 'rodada' && this.t >= R.inicioInvulnerabilidad && this.t < R.inicioInvulnerabilidad + R.invulnerabilidad;
  }

  private cambiarEstado(e: EstadoJugador): void { this.estado = e; this.t = 0; }

  private gastarEstamina(costo: number): boolean {
    if (this.estamina < costo) return false;
    this.estamina -= costo;
    this.pausaRegen = C.pausaRegenEstamina;
    return true;
  }

  /** Empieza una rodada en la dirección dada (no gasta estamina: eso lo hace actualizar()). */
  rodar(dx: number, dy: number): void {
    const l = Math.hypot(dx, dy) || 1;
    this.rodX = dx / l; this.rodY = dy / l;
    this.dirX = this.rodX; this.dirY = this.rodY;
    this.cambiarEstado('rodada');
    this.juego.assets.sonar('jugador.rodada');
  }

  /** ¿El abanico del ataque alcanza este círculo? */
  alcanza(c: Circulo): boolean {
    const A = C.ataque;
    const dx = c.x - this.x, dy = c.y - this.y, d = Math.hypot(dx, dy);
    if (d - c.r > A.alcance) return false;
    if (d < 1) return true;
    const tol = (A.arco / 2) * DEG + Math.asin(Math.min(1, c.r / d));
    return Math.abs(angDiff(Math.atan2(dy, dx), Math.atan2(this.dirY, this.dirX))) <= tol;
  }

  // ------------------------------------------------------------- lógica
  actualizar(dt: number): void {
    const juego = this.juego, entrada = juego.entrada;
    this.t += dt;
    if (this.invulnTras > 0) this.invulnTras -= dt;
    if (this.enfriamientoRodada > 0) this.enfriamientoRodada -= dt;
    this.vidaMostrada = this.vidaMostrada > this.vida
      ? Math.max(this.vida, this.vidaMostrada - C.vidaMax * 0.5 * dt) : this.vida;

    if (this.pausaRegen > 0) this.pausaRegen -= dt;
    else if (this.estado !== 'ataque' && this.estado !== 'rodada' && !this.muerto) {
      this.estamina = Math.min(C.estaminaMax, this.estamina + C.regenEstamina * dt);
    }

    // estela visual de la rodada
    this.tEstela -= dt;
    if (this.estado === 'rodada' && this.tEstela <= 0) { this.estela.push({ x: this.x, y: this.y, v: 0.25 }); this.tEstela = 0.03; }
    for (const e of this.estela) e.v -= dt;
    this.estela = this.estela.filter((e) => e.v > 0);

    if (this.muerto) return;

    const mov = entrada.movimiento();
    let vx = 0, vy = 0;

    switch (this.estado) {
      case 'normal': {
        if (mov.x || mov.y) { this.dirX = mov.x; this.dirY = mov.y; }
        vx = mov.x * C.velocidad; vy = mov.y * C.velocidad;
        if (entrada.hay('rodar') && this.enfriamientoRodada <= 0 && this.gastarEstamina(C.rodada.costo)) {
          entrada.consumir('rodar');
          // rueda hacia donde te mueves; si estás quieto, hacia donde miras
          if (mov.x || mov.y) this.rodar(mov.x, mov.y); else this.rodar(this.dirX, this.dirY);
          vx = vy = 0;
        } else if (entrada.hay('atacar') && this.gastarEstamina(C.ataque.costo)) {
          entrada.consumir('atacar');
          this.golpeConectado = false;
          this.cambiarEstado('ataque');
          juego.assets.sonar('jugador.ataque');
          vx = vy = 0;
        } else if (entrada.hay('curar')) {
          entrada.consumir('curar');
          if (this.cargas > 0 && this.vida < C.vidaMax) {
            this.cargas--; this.curasUsadas++;
            this.cambiarEstado('curando');
          }
        }
        break;
      }
      case 'ataque': {
        const A = C.ataque;
        vx = mov.x * C.velocidad * A.multVelocidad;
        vy = mov.y * C.velocidad * A.multVelocidad;
        const activo = this.t >= A.anticipacion && this.t < A.anticipacion + A.activo;
        if (activo && !this.golpeConectado) {
          for (const hb of juego.jefe.hurtboxes()) {
            if (!this.alcanza(hb)) continue;
            const hx = this.x + this.dirX * (this.r + 12), hy = this.y + this.dirY * (this.r + 12);
            if (juego.aplicarDanioAJefe(A.danio)) {
              juego.chispas(hx, hy, '#ffffff', 10, 220);
              juego.assets.sonar('jugador.impacto');
            } else {
              juego.chispas(hx, hy, '#8b91a1', 6, 140); // golpe sin efecto (jefe invulnerable)
            }
            this.golpeConectado = true;
            break;
          }
        }
        if (this.t >= A.anticipacion + A.activo + A.recuperacion) this.cambiarEstado('normal');
        break;
      }
      case 'rodada': {
        vx = this.rodX * C.rodada.velocidad;
        vy = this.rodY * C.rodada.velocidad;
        if (this.t >= C.rodada.duracion) {
          this.cambiarEstado('normal');
          this.enfriamientoRodada = C.rodada.enfriamiento;
        }
        break;
      }
      case 'curando': {
        vx = mov.x * C.velocidad * C.curacion.multVelocidad;
        vy = mov.y * C.velocidad * C.curacion.multVelocidad;
        if (this.t >= C.curacion.duracion) {
          this.vida = Math.min(C.vidaMax, this.vida + C.curacion.cantidad);
          this.vidaMostrada = this.vida;
          juego.chispas(this.x, this.y, '#5be37d', 18, 160);
          juego.assets.sonar('jugador.curacion');
          this.cambiarEstado('normal');
        }
        break;
      }
      case 'aturdido': {
        vx = this.empX; vy = this.empY;
        const f = Math.exp(-12 * dt);
        this.empX *= f; this.empY *= f;
        if (this.t >= C.golpeRecibido.aturdimiento) this.cambiarEstado('normal');
        break;
      }
    }

    this.x += vx * dt;
    this.y += vy * dt;
    this.resolverColisiones();
  }

  /** Aplica un golpe. Devuelve false si el jugador era invulnerable o ya estaba muerto. */
  recibirGolpe(danio: number, origenX: number, origenY: number): boolean {
    if (this.muerto || this.invulnerable) return false;
    const G = C.golpeRecibido, juego = this.juego;
    this.vida = Math.max(0, this.vida - danio);
    const dx = this.x - origenX, dy = this.y - origenY, d = Math.hypot(dx, dy) || 1;
    this.empX = (dx / d) * G.empuje;
    this.empY = (dy / d) * G.empuje;
    this.invulnTras = G.invulnerabilidad;
    juego.chispas(this.x, this.y, '#ff5a5a', 14, 200);
    if (this.vida <= 0) {
      this.cambiarEstado('muerto');
      juego.assets.sonar('jugador.muerte');
    } else {
      juego.assets.sonar('jugador.herido');
      const sigueCurando = this.estado === 'curando' && !C.curacion.seCancelaAlRecibirGolpe;
      if (!sigueCurando) this.cambiarEstado('aturdido'); // si se curaba, la carga ya se gastó y se pierde
    }
    return true;
  }

  private resolverColisiones(): void {
    for (const c of this.juego.jefe.cuerposSolidos()) {
      let dx = this.x - c.x, dy = this.y - c.y, d = Math.hypot(dx, dy);
      const min = c.r + this.r;
      if (d < min) {
        if (d < 0.001) { dx = 0; dy = 1; d = 1; }
        this.x = c.x + (dx / d) * min;
        this.y = c.y + (dy / d) * min;
      }
    }
    this.juego.arena.contener(this);
  }

  // ------------------------------------------------------------- dibujo
  dibujar(ctx: CanvasRenderingContext2D): void {
    for (const e of this.estela) {
      ctx.fillStyle = `rgba(110,180,255,${e.v * 1.2})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, this.r * 0.9, 0, TAU); ctx.fill();
    }
    if (this.muerto) {
      ctx.fillStyle = 'rgba(77,163,255,0.35)';
      ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.3, this.r * 0.6, 0, 0, TAU); ctx.fill();
      return;
    }
    if (this.estado === 'ataque') this.dibujarGolpe(ctx);
    // parpadeo tras recibir golpe
    if (this.invulnTras > 0 && Math.floor(this.invulnTras * 25) % 2 === 0) return;

    const ang = Math.atan2(this.dirY, this.dirX);
    const translucido = this.invulnerable && this.estado === 'rodada';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(this.x + 3, this.y + 6, this.r, this.r * 0.85, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = translucido ? 0.55 : 1;

    const sprite = this.juego.assets.imagen('jugador.cuerpo');
    if (sprite) {
      dibujarSprite(ctx, sprite, this.x, this.y, C.sprite.tamano, C.sprite.tamano, ang);
      if (this.estado === 'aturdido') {
        ctx.fillStyle = 'rgba(255,90,90,0.45)';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.fill();
      }
    } else {
      ctx.fillStyle = this.estado === 'aturdido' ? '#ff8a8a' : '#4da3ff';
      ctx.strokeStyle = '#0c2440'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.fill(); ctx.stroke();
      // indicador de dirección
      const r = this.r;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(ang) * (r + 8), this.y + Math.sin(ang) * (r + 8));
      ctx.lineTo(this.x + Math.cos(ang + 0.5) * (r - 2), this.y + Math.sin(ang + 0.5) * (r - 2));
      ctx.lineTo(this.x + Math.cos(ang - 0.5) * (r - 2), this.y + Math.sin(ang - 0.5) * (r - 2));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    if (this.estado === 'curando') {
      const prog = this.t / C.curacion.duracion;
      ctx.save();
      ctx.strokeStyle = '#5be37d'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke();
      ctx.fillStyle = `rgba(91,227,125,${0.15 + 0.15 * Math.sin(this.t * 20)})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // El abanico del golpe queda siempre geométrico: es información de juego, no decoración.
  private dibujarGolpe(ctx: CanvasRenderingContext2D): void {
    const A = C.ataque, ang = Math.atan2(this.dirY, this.dirX);
    let alfa: number, relleno: boolean;
    if (this.t < A.anticipacion) { alfa = 0.25; relleno = false; }
    else if (this.t < A.anticipacion + A.activo) { alfa = 0.85; relleno = true; }
    else { alfa = 0.4 * (1 - (this.t - A.anticipacion - A.activo) / A.recuperacion); relleno = true; }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, A.alcance, ang - A.arco / 2 * DEG, ang + A.arco / 2 * DEG);
    ctx.closePath();
    if (relleno) { ctx.fillStyle = `rgba(255,255,255,${alfa})`; ctx.fill(); }
    else { ctx.strokeStyle = `rgba(255,255,255,${alfa})`; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
  }
}
