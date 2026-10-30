import { MANIFIESTO, type ClaveSonido, type EntradaSonido } from '../src/config/manifiesto.ts';
import { CONFIG_JUEGO } from '../src/config/juego.ts';

const CUANDO: Record<ClaveSonido, string> = {
  'jugador.ataque': 'Al empezar un golpe',
  'jugador.impacto': 'El golpe daña al jefe',
  'jugador.rodada': 'Al rodar',
  'jugador.curacion': 'La cura se aplica',
  'jugador.herido': 'Recibes daño',
  'jugador.muerte': 'Mueres',
  'relojero.avisoBarrido': 'Aparece la cuña roja (0,7 s antes)',
  'relojero.barrido': 'La aguja barre',
  'relojero.campanada': 'Cada pulso del anillo',
  'relojero.engranajeFijado': 'La línea punteada se fija (0,6 s antes)',
  'relojero.engranajeDisparo': 'Sale el engranaje',
  'relojero.fase2': 'Pasa a fase 2',
  'relojero.muerte': 'Derrotas al jefe',
  'ui.victoria': 'Pantalla de victoria',
  'musica.menu': 'Música del menú',
  'musica.relojero': 'Música de la pelea',
};

const A = CONFIG_JUEGO.audio;
const lista = document.getElementById('lista') as HTMLElement;
const efectos: HTMLAudioElement[] = [];
let grupo = '';

for (const [clave, e] of Object.entries(MANIFIESTO.sonidos) as [ClaveSonido, EntradaSonido][]) {
  const g = clave.split('.')[0] ?? '';
  if (g !== grupo) {
    grupo = g;
    const h = document.createElement('h2');
    h.textContent = g;
    lista.appendChild(h);
  }
  const fila = document.createElement('div');
  fila.className = 'fila' + (e.listo ? '' : ' falta');
  const boton = document.createElement('button');
  boton.textContent = '▶';
  boton.setAttribute('aria-label', `Reproducir ${clave}`);
  const info = document.createElement('div');
  info.className = 'info';
  const nombre = document.createElement('div');
  nombre.className = 'clave';
  nombre.textContent = clave + (e.listo ? '' : ' (no está listo)');
  const cuando = document.createElement('div');
  cuando.className = 'cuando';
  cuando.textContent = CUANDO[clave];
  info.append(nombre, cuando);
  fila.append(boton, info);

  const audio = new Audio(`${import.meta.env.BASE_URL}${e.ruta}`);
  const esMusica = clave.startsWith('musica');
  audio.volume = Math.min(1, A.volumenGeneral * (esMusica ? A.volumenMusica : A.volumenEfectos) * (e.volumen ?? 1));
  boton.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); });
  if (e.listo && !esMusica) efectos.push(audio);
  lista.appendChild(fila);
}

document.getElementById('todos')?.addEventListener('click', async () => {
  for (const a of efectos) {
    a.currentTime = 0;
    await a.play().catch(() => {});
    await new Promise((listo) => setTimeout(listo, (a.duration || 1) * 1000 + 450));
  }
});
