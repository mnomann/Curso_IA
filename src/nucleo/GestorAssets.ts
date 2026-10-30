import type { ConfigAudio } from '../config/juego.ts';
import type { ClaveImagen, ClaveSonido, EntradaSonido, Manifiesto } from '../config/manifiesto.ts';

/**
 * Lo que el juego necesita de los assets. Juego, Jugador y los jefes dependen
 * de esta interfaz y no de GestorAssets, así las pruebas pueden usar una versión
 * en silencio sin navegador.
 */
export interface ServicioAssets {
  imagen(clave: ClaveImagen): HTMLImageElement | null;
  sonar(clave: ClaveSonido, volumen?: number): void;
  musica(clave: ClaveSonido): void;
  pausarMusica(): void;
  reanudarMusica(): void;
  detenerMusica(): void;
}

interface Bucle { buffer: AudioBuffer; inicio: number; fin: number; volumen: number }
type AudioConVolumen = HTMLAudioElement & { volumenBase: number };

/** Convierte 'assets/...' en una URL que funciona en desarrollo y en el build (base relativa). */
const resolver = (ruta: string): string => `${import.meta.env.BASE_URL}${ruta}`;

/**
 * Carga sprites y sonidos declarados en src/config/manifiesto.ts.
 *
 * Regla de oro: NINGÚN asset es obligatorio. Si una entrada tiene listo:false,
 * o el archivo no carga, imagen() devuelve null y sonar() no hace nada; el
 * código que dibuja cae entonces a las formas geométricas de siempre.
 */
export class GestorAssets implements ServicioAssets {
  private readonly audio: ConfigAudio;
  private readonly imagenes = new Map<ClaveImagen, HTMLImageElement>();
  private readonly sonidos = new Map<ClaveSonido, AudioConVolumen>();
  private readonly bucles = new Map<ClaveSonido, Bucle>();   // música con bucle exacto (Web Audio)
  readonly faltantes: string[] = [];
  private musicaActual: AudioConVolumen | null = null;
  private claveMusica: ClaveSonido | null = null;
  private ctx: AudioContext | null | undefined = undefined;  // se crea al primer uso
  private fuente: AudioBufferSourceNode | null = null;       // bucle sonando ahora
  private gananciaMusica: GainNode | null = null;
  private volumenBucle = 1;

  constructor(private readonly manifiesto: Manifiesto, configAudio: ConfigAudio) {
    this.audio = { ...configAudio }; // copia: el menú de opciones la cambia sin tocar el CONFIG
  }

  /** AudioContext compartido (null si el navegador no tiene Web Audio). */
  private contexto(): AudioContext | null {
    if (this.ctx === undefined) {
      const g = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Ctx = g.AudioContext ?? g.webkitAudioContext;
      this.ctx = Ctx ? new Ctx() : null;
    }
    return this.ctx;
  }

  async cargar(): Promise<void> {
    const tareas: Promise<void>[] = [];
    for (const [clave, e] of Object.entries(this.manifiesto.imagenes) as [ClaveImagen, { ruta: string; listo: boolean }][]) {
      if (!e.listo) { this.faltantes.push(clave); continue; }
      tareas.push(this.cargarImagen(clave, e.ruta));
    }
    for (const [clave, e] of Object.entries(this.manifiesto.sonidos) as [ClaveSonido, EntradaSonido][]) {
      if (!e.listo) { this.faltantes.push(clave); continue; }
      this.cargarSonido(clave, e); // el audio no bloquea el arranque
    }
    await Promise.all(tareas);
    const activos = this.imagenes.size + this.sonidos.size + this.bucles.size;
    console.info(`[assets] ${activos} cargados · ${this.faltantes.length} usando respaldo geométrico/silencio`);
  }

  private cargarImagen(clave: ClaveImagen, ruta: string): Promise<void> {
    return new Promise((listo) => {
      const img = new Image();
      img.onload = () => { this.imagenes.set(clave, img); listo(); };
      img.onerror = () => {
        console.warn(`[assets] No se pudo cargar la imagen "${clave}" en ${ruta}. Se usa la forma geométrica.`);
        this.faltantes.push(clave);
        listo();
      };
      img.src = resolver(ruta);
    });
  }

  private cargarSonido(clave: ClaveSonido, entrada: EntradaSonido): void {
    // Música con "bucle" (segundos): Web Audio, para que la repetición no deje hueco.
    // <audio loop> con MP3 deja un silencio breve en cada vuelta por el relleno del codificador.
    const ctx = entrada.bucle ? this.contexto() : null;
    if (entrada.bucle && ctx) { void this.cargarBucle(ctx, clave, entrada, entrada.bucle); return; }
    const a = Object.assign(new Audio(), { volumenBase: entrada.volumen ?? 1 });
    a.preload = 'auto';
    a.addEventListener('error', () => {
      console.warn(`[assets] No se pudo cargar el sonido "${clave}" en ${entrada.ruta}.`);
      this.sonidos.delete(clave);
    });
    a.src = resolver(entrada.ruta);
    this.sonidos.set(clave, a);
  }

  private async cargarBucle(ctx: AudioContext, clave: ClaveSonido, entrada: EntradaSonido, duracion: number): Promise<void> {
    try {
      const respuesta = await fetch(resolver(entrada.ruta));
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const buffer = await ctx.decodeAudioData(await respuesta.arrayBuffer());
      // Algunos decodificadores dejan el relleno del MP3 al inicio: el bucle parte en la primera muestra audible.
      const c = buffer.getChannelData(0);
      let i = 0;
      while (i < c.length - 1 && Math.abs(c[i] ?? 0) < 1e-4) i++;
      const inicio = i / buffer.sampleRate;
      this.bucles.set(clave, {
        buffer, inicio,
        fin: Math.min(buffer.duration, inicio + duracion),
        volumen: entrada.volumen ?? 1,
      });
      // si pidieron esta música mientras cargaba, que empiece ahora
      if (this.claveMusica === clave && !this.fuente) this.iniciarBucle(clave);
    } catch (e) {
      console.warn(`[assets] No se pudo cargar la música "${clave}" en ${entrada.ruta}.`, e);
    }
  }

  private iniciarBucle(clave: ClaveSonido): void {
    const b = this.bucles.get(clave), ctx = this.ctx;
    if (!b || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const fuente = ctx.createBufferSource();
    fuente.buffer = b.buffer;
    fuente.loop = true;
    fuente.loopStart = b.inicio;
    fuente.loopEnd = b.fin;
    const ganancia = ctx.createGain();
    ganancia.gain.value = Math.min(1, this.audio.volumenGeneral * this.audio.volumenMusica * b.volumen);
    fuente.connect(ganancia).connect(ctx.destination);
    fuente.start(0, b.inicio);
    this.fuente = fuente;
    this.gananciaMusica = ganancia;
    this.volumenBucle = b.volumen;
  }

  /** Imagen cargada o null (y entonces se dibuja la forma geométrica). */
  imagen(clave: ClaveImagen): HTMLImageElement | null { return this.imagenes.get(clave) ?? null; }

  /** Reproduce un efecto. Varios a la vez se superponen. */
  sonar(clave: ClaveSonido, volumen = 1): void {
    const base = this.sonidos.get(clave);
    if (!base) return;
    const a = base.cloneNode() as HTMLAudioElement;
    a.volume = Math.min(1, this.audio.volumenGeneral * this.audio.volumenEfectos * base.volumenBase * volumen);
    a.play().catch(() => {}); // el navegador puede bloquear audio antes de la primera interacción
  }

  musica(clave: ClaveSonido): void {
    if (this.claveMusica === clave) return;
    this.detenerMusica();
    this.claveMusica = clave;
    if (this.bucles.has(clave)) { this.iniciarBucle(clave); return; }
    const base = this.sonidos.get(clave);
    if (!base) return; // puede seguir cargando: cargarBucle la inicia al terminar
    base.loop = true;
    base.currentTime = 0;
    base.volume = Math.min(1, this.audio.volumenGeneral * this.audio.volumenMusica * base.volumenBase);
    base.play().catch(() => {});
    this.musicaActual = base;
  }

  /**
   * Cambia el volumen de música y/o efectos (0 a 1). La música cambia al instante;
   * los efectos, desde el próximo que suene.
   */
  fijarVolumen({ musica, efectos }: { musica?: number; efectos?: number } = {}): void {
    if (typeof efectos === 'number') this.audio.volumenEfectos = efectos;
    if (typeof musica === 'number') {
      this.audio.volumenMusica = musica;
      const base = this.audio.volumenGeneral * musica;
      if (this.gananciaMusica) this.gananciaMusica.gain.value = Math.min(1, base * this.volumenBucle);
      if (this.musicaActual) this.musicaActual.volume = Math.min(1, base * this.musicaActual.volumenBase);
    }
  }

  pausarMusica(): void {
    if (this.fuente && this.ctx) this.ctx.suspend().catch(() => {});
    this.musicaActual?.pause();
  }

  reanudarMusica(): void {
    if (this.fuente && this.ctx) this.ctx.resume().catch(() => {});
    this.musicaActual?.play().catch(() => {});
  }

  detenerMusica(): void {
    if (this.fuente) {
      try { this.fuente.stop(); } catch { /* ya detenida */ }
      this.fuente.disconnect();
      this.fuente = null;
      this.gananciaMusica = null;
    }
    if (this.musicaActual) { this.musicaActual.pause(); this.musicaActual.currentTime = 0; }
    this.musicaActual = null;
    this.claveMusica = null;
  }
}
