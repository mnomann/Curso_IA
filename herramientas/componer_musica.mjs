/**
 * Música de pelea de El Relojero Sin Hora: compuesta por código y "tocada"
 * con el banco orquestal GeneralUser GS (licencia libre para crear música,
 * incluso comercial). La partitura completa está en este archivo.
 *
 * Re menor, 120 BPM, 32 compases (64 s) en bucle:
 *   A (1-8)   tic-tac en pizzicato, cuerdas suaves, timbales
 *   B (9-16)  entra el tema en trompas, chelos en corcheas, bombo
 *   C (17-24) clímax: trompetas, coro, cuerdas en semicorcheas
 *   D (25-32) puente sobre la dominante, redoble de timbal que vuelve a A
 *
 * Uso (desde la carpeta del proyecto):
 *   npm install          (instala spessasynth_core, ya está en package.json)
 *   (descarga GeneralUser-GS.sf2 desde https://www.schristiancollins.com/generaluser)
 *   npm run audio:musica -- ruta/GeneralUser-GS.sf2 salida.wav
 *   ffmpeg -i salida.wav -b:a 160k public/assets/musica/relojero.mp3
 */
import fs from 'fs';
import { SpessaSynthProcessor, SoundBankLoader } from 'spessasynth_core';

const [, , rutaSf2 = 'GeneralUser-GS.sf2', rutaSalida = 'relojero.wav'] = process.argv;
const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;          // 0,5 s
const BAR = BEAT * 4;           // 2 s
const COMPASES = 32;
const LOOP = COMPASES * BAR;    // 64 s

// ------------------------------------------------------------------ azar con semilla (mismo resultado siempre)
let semilla = 12345;
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296);
const varia = (v, r) => v + (azar() * 2 - 1) * r;

// ------------------------------------------------------------------ armonía
// raíz grave (octava 2) y tríada en la octava 4
const ACORDES = {
  Dm: { raiz: 38, triada: [62, 65, 69] },
  Bb: { raiz: 46, triada: [58, 62, 65] },
  Gm: { raiz: 43, triada: [55, 58, 62] },
  A:  { raiz: 45, triada: [57, 61, 64] },
};
const PROG = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A'];
const PROG_PUENTE = ['Gm', 'Gm', 'Bb', 'Bb', 'A', 'A', 'A', 'A'];
const seccion = (c) => (c < 8 ? 'A' : c < 16 ? 'B' : c < 24 ? 'C' : 'D');
const acorde = (c) => ACORDES[(seccion(c) === 'D' ? PROG_PUENTE : PROG)[c % 8]];

// Tema (8 compases): [nota MIDI, duración en tiempos]
const TEMA = [
  [62, 1.5], [69, 0.5], [69, 1], [65, 1],   [67, 1], [69, 1], [74, 2],
  [72, 1.5], [70, 0.5], [69, 1], [67, 1],   [65, 1], [67, 1], [70, 2],
  [69, 1.5], [67, 0.5], [65, 1], [64, 1],   [65, 1], [67, 1], [70, 2],
  [69, 1.5], [73, 0.5], [76, 1], [73, 1],   [69, 4],
];

// ------------------------------------------------------------------ canales: [programa GM, volumen, paneo, reverb]
const CANAL = {
  pizz:      [0, 45, 116, 46, 70],
  chelos:    [1, 42, 110, 54, 70],
  contrabajo:[2, 43, 102, 64, 60],
  cuerdas:   [3, 48, 86, 64, 85],
  coro:      [4, 52, 82, 64, 95],
  trompas:   [5, 60, 108, 76, 75],
  trompetas: [6, 56, 98, 84, 70],
  trombones: [7, 57, 96, 88, 70],
  timbales:  [8, 47, 112, 64, 60],
  campanas:  [10, 14, 84, 40, 100],
  rapidas:   [11, 48, 78, 36, 70],
  bateria:   [9, 0, 100, 64, 55],   // canal 10 GM = percusión
};
const PERC = { bombo: 36, platillo: 49, tom: 41 };

// ------------------------------------------------------------------ eventos
const eventos = []; // [tiempo, prioridad, fn(synth)]
function nota(nombre, t, dur, alto, vel, jitter = 0.006) {
  const ch = CANAL[nombre][0];
  const ti = Math.max(0, varia(t, jitter));
  const v = Math.round(Math.max(1, Math.min(127, varia(vel, 6))));
  eventos.push([ti, 1, (s) => s.noteOn(ch, alto, v)]);
  eventos.push([ti + dur * 0.98, 0, (s) => s.noteOff(ch, alto)]);
}
function cc(nombre, t, control, valor) {
  const ch = CANAL[nombre][0];
  eventos.push([t, 0, (s) => s.controllerChange(ch, control, valor)]);
}
function rampa(nombre, t0, t1, v0, v1) { // expresión (CC11) gradual
  for (let t = t0; t <= t1; t += 0.1) cc(nombre, t, 11, Math.round(v0 + (v1 - v0) * (t - t0) / (t1 - t0)));
}

// ------------------------------------------------------------------ partitura de un ciclo (se agrega con desplazamiento)
function ciclo(off) {
  semilla = 12345; // misma humanización en cada vuelta: el bucle empalma exacto
  for (let c = 0; c < COMPASES; c++) {
    const t0 = off + c * BAR, s = seccion(c), ac = acorde(c), [r1, r3, r5] = ac.triada;
    const fuerte = s === 'C' ? 1.15 : s === 'A' ? 0.95 : 1;

    // tic-tac del reloj: pizzicato en corcheas, siempre presente
    for (let i = 0; i < 8; i++) {
      const tic = i % 2 === 0;
      nota('pizz', t0 + i * BEAT / 2, 0.2, tic ? r1 + 12 : r5, (tic ? 88 : 66) * fuerte);
    }

    // contrabajo: redonda en la raíz
    nota('contrabajo', t0, BAR, ac.raiz, s === 'A' ? 88 : s === 'C' ? 110 : 95);

    // chelos: blancas en A, corcheas con acentos desde B
    if (s === 'A') { // corcheas suaves: la energía no se cae al volver al inicio del bucle
      for (let i = 0; i < 8; i++) nota('chelos', t0 + i * BEAT / 2, 0.22, ac.raiz + 12, i % 4 === 0 ? 84 : 62);
    } else {
      for (let i = 0; i < 8; i++) {
        const alto = ac.raiz + 12 + (i === 6 ? 12 : i === 7 ? 7 : 0);
        nota('chelos', t0 + i * BEAT / 2, 0.22, alto, i % 4 === 0 ? 108 : 78);
      }
    }

    // colchón de cuerdas (y octava arriba en el clímax)
    const velCuerdas = { A: 74, B: 74, C: 100, D: 78 }[s];
    for (const n of ac.triada) nota('cuerdas', t0, BAR, n, velCuerdas, 0.002);
    if (s === 'C') { nota('cuerdas', t0, BAR, r1 + 12, 96, 0.002); nota('cuerdas', t0, BAR, r5 + 12, 88, 0.002); }

    // coro en clímax y puente
    if (s === 'C' || s === 'D') for (const n of ac.triada) nota('coro', t0, BAR, n, s === 'C' ? 98 : 74, 0.002);

    // trombones: raíz y quinta sostenidas (B, C); golpes rítmicos al final del puente
    if (s === 'A' || s === 'B' || s === 'C') { // en A, suaves: dan cuerpo sin anticipar el tema
      const vt = s === 'C' ? 100 : s === 'B' ? 82 : 74;
      nota('trombones', t0, BAR, ac.raiz + 12, vt); nota('trombones', t0, BAR, ac.raiz + 19, vt - 6);
    } else if (s === 'D' && c >= 28) {
      for (const [b, v] of [[0, 112], [1.5, 96], [3, 104]]) {
        nota('trombones', t0 + b * BEAT, 0.35, ac.raiz + 12, v); nota('trombones', t0 + b * BEAT, 0.35, ac.raiz + 19, v - 8);
      }
    }

    // trompas en el puente: notas largas de tensión
    if (s === 'D') { nota('trompas', t0, BAR, r3, 84); nota('trompas', t0, BAR, r5, 80); }

    // timbales
    if (s === 'A' || (s === 'D' && c < 30)) {
      nota('timbales', t0, 0.5, ac.raiz, 104, 0.003); nota('timbales', t0 + 2 * BEAT, 0.5, ac.raiz, 88, 0.003);
    } else if (s === 'B' || s === 'C') {
      for (const [b, v] of [[0, 118], [1.5, 82], [2, 102], [3, 92], [3.5, 86]]) nota('timbales', t0 + b * BEAT, 0.4, ac.raiz, v, 0.003);
    } else { // redoble de 2 compases que crece hacia el inicio del bucle
      for (let i = 0; i < 16; i++) nota('timbales', t0 + i * BEAT / 4, 0.12, ac.raiz, 50 + ((c - 30) * 16 + i) * 2.4, 0.002);
    }

    // campana del reloj: cada 2 compases (cada compás en el clímax)
    if (c % 2 === 0 || s === 'C') nota('campanas', t0, BAR * 1.5, r1 + 12, s === 'C' ? 96 : 84, 0.001);

    // percusión: bombo y platillo
    if (s === 'A') nota('bateria', t0, 0.3, PERC.bombo, 82, 0.002);
    if (s === 'B' || s === 'C') {
      nota('bateria', t0, 0.3, PERC.bombo, 104, 0.002);
      if (s === 'C') { nota('bateria', t0 + 2 * BEAT, 0.3, PERC.bombo, 92, 0.002); nota('bateria', t0 + 3.5 * BEAT, 0.2, PERC.tom, 88, 0.002); }
    }
    if (c === 0 || c === 8 || c === 16) nota('bateria', t0, 2, PERC.platillo, c === 16 ? 112 : 96, 0.001);

    // cuerdas rápidas en semicorcheas (clímax)
    if (s === 'C') {
      const arp = [r1 + 12, r3 + 12, r5 + 12, r3 + 12];
      for (let i = 0; i < 16; i++) nota('rapidas', t0 + i * BEAT / 4, 0.11, arp[i % 4], i % 4 === 0 ? 98 : 82, 0.003);
    }
  }

  // tema: trompas en B; trompetas una octava arriba + trompas en C
  for (const [sec, inst, transp, vel] of [[8, 'trompas', 0, 94], [16, 'trompetas', 12, 114], [16, 'trompas', 0, 100]]) {
    let t = off + sec * BAR;
    for (const [n, d] of TEMA) { nota(inst, t, d * BEAT * 0.95, n + transp, vel); t += d * BEAT; }
  }

  // dinámica: crescendo en el puente hacia el inicio
  rampa('cuerdas', off + 24 * BAR, off + 32 * BAR - 0.1, 90, 127);
  rampa('coro', off + 24 * BAR, off + 32 * BAR - 0.1, 85, 127);
  cc('cuerdas', off, 11, 110); cc('coro', off, 11, 110);
}

// ------------------------------------------------------------------ render
const synth = new SpessaSynthProcessor(SR, { maxBufferSize: 128, effectsEnabled: true });
const buf = fs.readFileSync(rutaSf2);
synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)), 'main');
await synth.processorInitialized;

for (const [, [ch, prog, vol, pan, rev]] of Object.entries(CANAL)) {
  if (ch !== 9) synth.programChange(ch, prog);
  synth.controllerChange(ch, 7, vol);
  synth.controllerChange(ch, 10, pan);
  synth.controllerChange(ch, 91, rev);
  synth.controllerChange(ch, 11, 110);
}

// Tres vueltas seguidas. Nos quedamos con la segunda: ya incluye las colas de reverberación
// del final de la primera, tal como suena al repetirse en el juego. La tercera sirve para el
// fundido de empalme (ver más abajo).
ciclo(0);
ciclo(LOOP);
ciclo(2 * LOOP);
eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const FUNDIDO = Math.round(0.08 * SR);
const total = Math.ceil(2 * LOOP * SR) + FUNDIDO + 128;
const L = new Float32Array(total), R = new Float32Array(total);
let i = 0, e = 0;
while (i < total) {
  while (e < eventos.length && eventos[e][0] * SR <= i) eventos[e++][2](synth);
  const siguiente = e < eventos.length ? Math.ceil(eventos[e][0] * SR) : total;
  const n = Math.max(1, Math.min(128, siguiente - i, total - i));
  synth.process(L, R, i, n);
  i += n;
}

// Empalme: los efectos internos del sintetizador no se reinician, así que dos vueltas no son
// idénticas a nivel de muestra. Los primeros 80 ms del bucle se funden desde lo que realmente
// sonaría tras el final (inicio de la 3ª vuelta) hacia la 2ª vuelta: al repetirse no hay clic.
const ini = Math.round(LOOP * SR), fin = ini + Math.round(LOOP * SR);
for (let k = 0; k < FUNDIDO; k++) {
  const w = k / FUNDIDO;
  L[ini + k] = L[fin + k] * (1 - w) + L[ini + k] * w;
  R[ini + k] = R[fin + k] * (1 - w) + R[ini + k] * w;
}
let pico = 0;
for (let k = ini; k < fin; k++) pico = Math.max(pico, Math.abs(L[k]), Math.abs(R[k]));
const g = 0.89 / pico;
const datos = Buffer.alloc(44 + (fin - ini) * 4);
datos.write('RIFF', 0); datos.writeUInt32LE(36 + (fin - ini) * 4, 4); datos.write('WAVEfmt ', 8);
datos.writeUInt32LE(16, 16); datos.writeUInt16LE(1, 20); datos.writeUInt16LE(2, 22); datos.writeUInt32LE(SR, 24);
datos.writeUInt32LE(SR * 4, 28); datos.writeUInt16LE(4, 32); datos.writeUInt16LE(16, 34); datos.write('data', 36);
datos.writeUInt32LE((fin - ini) * 4, 40);
for (let k = ini, o = 44; k < fin; k++, o += 4) {
  datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k] * g)) * 32767), o);
  datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k] * g)) * 32767), o + 2);
}
fs.writeFileSync(rutaSalida, datos);
console.log(`listo: ${rutaSalida}  ${(fin - ini) / SR}s  ganancia ${g.toFixed(2)}  eventos ${eventos.length}`);
