import type { DefJefe } from '../jefes/registro.ts';
import type { EstadoJuego, Juego } from './Juego.ts';

export type TipoVolumen = 'musica' | 'efectos';

/** Lo que el núcleo necesita de las pantallas (las pruebas usan una versión vacía). */
export interface VistaPantallas {
  mostrar(estado: EstadoJuego, juego: Juego): void;
}

export interface AccionesPantallas {
  alElegir: (def: DefJefe) => void;
  alContinuar: () => void;
  alReintentar: () => void;
  alMenu: () => void;
  alAbrirOpciones: () => void;
  alCerrarOpciones: () => void;
  alCambiarVolumen: (tipo: TipoVolumen, valor: number) => void;
  alProbarEfectos: () => void;
}

/** Imágenes para el fondo del menú (URLs ya cargadas, o null). */
export interface FondoMenu {
  ilustracion: string | null;
  suelo: string | null;
  esfera: string | null;
}

const TECLAS_ARRIBA = ['ArrowUp', 'KeyW'];
const TECLAS_ABAJO = ['ArrowDown', 'KeyS'];

/**
 * Pantallas HTML sobre el canvas: menú, opciones, pausa, muerte y victoria.
 * Las opciones se eligen con el mouse, con Tab, o con flechas / W-S; la aguja
 * de reloj marca siempre la opción con el foco.
 */
export class Pantallas implements VistaPantallas {
  private readonly deslizadores = {} as Record<TipoVolumen, { control: HTMLInputElement; salida: HTMLOutputElement }>;

  constructor(private readonly doc: Document, jefes: readonly DefJefe[], acciones: AccionesPantallas) {
    const jefe = jefes[0];
    if (!jefe) throw new Error('El registro de jefes está vacío.');
    this.porId('lema-jefe').textContent = jefe.descripcion;

    const enlazar = (id: string, fn: () => void) => this.porId(id).addEventListener('click', fn);
    enlazar('btn-comenzar', () => acciones.alElegir(jefe));
    enlazar('btn-continuar', acciones.alContinuar);
    enlazar('btn-pausa-menu', acciones.alMenu);
    enlazar('btn-reintentar', acciones.alReintentar);
    enlazar('btn-muerte-menu', acciones.alMenu);
    enlazar('btn-revancha', acciones.alReintentar);
    enlazar('btn-victoria-menu', acciones.alMenu);
    enlazar('btn-menu-opciones', acciones.alAbrirOpciones);
    enlazar('btn-pausa-opciones', acciones.alAbrirOpciones);
    enlazar('btn-opciones-volver', acciones.alCerrarOpciones);

    // deslizadores de volumen: cambian en vivo; al soltar el de efectos suena uno de muestra
    for (const tipo of ['musica', 'efectos'] as const) {
      const control = this.porId<HTMLInputElement>('vol-' + tipo);
      const salida = this.porId<HTMLOutputElement>(`vol-${tipo}-valor`);
      control.addEventListener('input', () => {
        this.pintarDeslizador(control, salida);
        acciones.alCambiarVolumen(tipo, Number(control.value));
      });
      if (tipo === 'efectos') control.addEventListener('change', () => acciones.alProbarEfectos());
      this.deslizadores[tipo] = { control, salida };
    }

    // la aguja sigue al mouse: moverlo sobre una opción le da el foco (una sola opción marcada a la vez).
    // Es pointermove y no mouseenter a propósito: si una pantalla aparece bajo un cursor quieto,
    // no debe robarle el foco a la opción por defecto (un Enter elegiría algo que no viste).
    for (const op of this.doc.querySelectorAll<HTMLButtonElement>('.opcion')) {
      op.addEventListener('pointermove', () => { if (this.doc.activeElement !== op) op.focus({ preventScroll: true }); });
    }
    this.doc.addEventListener('keydown', (e) => this.navegar(e));
  }

  /** Busca un elemento por id; si falta en index.html, avisa claramente. */
  private porId<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = this.doc.getElementById(id);
    if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
    return el as T;
  }

  /** Flechas o W/S mueven la aguja entre las opciones de la pantalla visible. */
  private navegar(e: KeyboardEvent): void {
    const arriba = TECLAS_ARRIBA.includes(e.code), abajo = TECLAS_ABAJO.includes(e.code);
    if (!arriba && !abajo) return;
    const pantalla = this.doc.querySelector<HTMLElement>('.pantalla.visible');
    if (!pantalla) return;
    const activo = this.doc.activeElement;
    if (activo instanceof HTMLInputElement && e.code.startsWith('Arrow')) return; // las flechas mueven el deslizador
    const opciones = [...pantalla.querySelectorAll<HTMLElement>('input[type="range"], .opcion')];
    if (!opciones.length) return;
    e.preventDefault();
    const i = activo instanceof HTMLElement ? opciones.indexOf(activo) : -1;
    const n = opciones.length;
    const sig = i < 0 ? 0 : (i + (abajo ? 1 : -1) + n) % n;
    opciones[sig]?.focus();
  }

  private pintarDeslizador(control: HTMLInputElement, salida: HTMLOutputElement): void {
    salida.textContent = control.value + '%';
    control.style.setProperty('--valor', control.value + '%');
  }

  /** Pone los deslizadores en los valores guardados (0 a 100). */
  ponerVolumenes(valores: Record<TipoVolumen, number>): void {
    for (const tipo of ['musica', 'efectos'] as const) {
      const d = this.deslizadores[tipo];
      d.control.value = String(valores[tipo]);
      this.pintarDeslizador(d.control, d.salida);
    }
  }

  /**
   * Fondo del menú: la ilustración si existe; si no, el suelo de la torre en penumbra
   * con la esfera del jefe apagada a la derecha.
   */
  ponerFondoMenu({ ilustracion, suelo, esfera }: FondoMenu): void {
    const marco = this.porId('marco');
    const imagen = ilustracion ?? suelo;
    if (imagen) marco.style.setProperty('--fondo-menu', `url("${imagen}")`);
    if (esfera) marco.style.setProperty('--esfera-menu', `url("${esfera}")`);
    for (const id of ['pantalla-menu', 'pantalla-opciones']) {
      this.porId(id).classList.toggle('sin-ilustracion', !ilustracion);
    }
  }

  /** Muestra la pantalla del estado indicado ('jugando' oculta todas). */
  mostrar(estado: EstadoJuego, juego: Juego): void {
    for (const el of this.doc.querySelectorAll('.pantalla')) el.classList.remove('visible');
    if (estado !== 'menu') this.porId('pantalla-menu').classList.remove('primera-vez');
    if (estado === 'victoria') {
      const t = juego.tiempo, cargas = juego.config.jugador.curacion.cargas;
      this.porId('stat-tiempo').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      this.porId('stat-curas').textContent = `${juego.jugador.curasUsadas} de ${cargas}`;
    }
    // opciones desde la pausa: sobre la pelea congelada; desde el menú: con el fondo del menú
    if (estado === 'opciones') this.porId('pantalla-opciones').classList.toggle('sobre-pelea', juego.enPelea);

    const el = this.doc.getElementById('pantalla-' + estado);
    if (el) {
      el.classList.add('visible');
      el.querySelector<HTMLElement>('input[type="range"], .opcion')?.focus({ preventScroll: true });
    } else if (this.doc.activeElement instanceof HTMLElement) {
      this.doc.activeElement.blur(); // que Espacio no "pulse" un botón oculto durante la pelea
    }
  }
}
