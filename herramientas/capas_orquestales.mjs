/**
 * Capas orquestales de los efectos de sonido, con los mismos instrumentos y la
 * misma tonalidad (re) que la música de pelea, para que suenen como parte de ella.
 * generar_sonidos.py las mezcla después con capas sintéticas (silbidos, resortes).
 *
 * Uso (desde la carpeta del proyecto):
 *   npm install          (instala spessasynth_core, ya está en package.json)
 *   npm run audio:capas -- ruta/GeneralUser-GS.sf2
 *   python herramientas/generar_sonidos.py
 * Escribe herramientas/capas/<nombre>.wav (mono, 44,1 kHz).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpessaSynthProcessor, SoundBankLoader } from 'spessasynth_core';

const SR = 44100;
const rutaSf2 = process.argv[2] || 'GeneralUser-GS.sf2';
const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'capas');

// Instrumentos General MIDI (los mismos de la música)
const I = {
  campana: 14, celesta: 8, pizz: 45, tremolo: 44, cuerdas: 48, arpa: 46, coro: 52,
  golpeOrquesta: 55, trompeta: 56, trombon: 57, trompa: 60, timbal: 47, contrabajo: 43,
};
// Percusión (canal 10 GM)
const P = { bombo: 36, platillo: 49, maderaAguda: 76, maderaGrave: 77 };
// Notas: re menor / re mayor
const N = { A1: 33, D2: 38, Eb2: 39, A2: 45, D3: 50, F3: 53, A3: 57, D4: 62, F4: 65, Fs4: 66, A4: 69, D5: 74, Fs5: 78, A5: 81, D6: 86 };

/**
 * Cada capa: duración y lista de notas [inicio s, instrumento | 'perc', nota, velocidad, largo s].
 * "expresion" opcional: rampas de volumen [instrumento, t0, t1, desde, hasta] (CC11, 0-127).
 */
function tics(desde, hasta, intervalo0, factor, minimo, notaIni, subeCada = 1) {
  const out = []; let t = desde, iv = intervalo0, n = notaIni, i = 0;
  while (t < hasta) { out.push([t, n, i]); t += iv; iv = Math.max(minimo, iv * factor); if (++i % subeCada === 0) n++; }
  return out;
}

const CAPAS = {
  impacto: { dur: 0.6, notas: [
    [0, I.pizz, N.D3, 124, 0.3], [0, I.pizz, N.A3, 110, 0.3],
    [0, 'perc', P.maderaGrave, 110, 0.2], [0, I.timbal, N.D2, 96, 0.3],
  ] },
  curacion: { dur: 1.4, notas: [
    ...[N.D4, N.Fs4, N.A4, N.D5, N.Fs5].map((n, i) => [i * 0.06, I.arpa, n, 96, 0.9]),
    [0.26, I.celesta, N.A5, 78, 0.8], [0.32, I.celesta, N.D6, 74, 0.8],
  ] },
  herido: { dur: 0.7, notas: [
    [0, I.trombon, N.D2 + 12, 122, 0.22], [0, I.trombon, N.Eb2 + 12, 118, 0.22], // segunda menor: disonancia de dolor
    [0, I.timbal, N.A1, 112, 0.4], [0, 'perc', P.bombo, 100, 0.2],
  ] },
  muerte_jugador: { dur: 2.4, notas: [
    [0, I.timbal, N.D2, 110, 0.6], [0, I.contrabajo, N.D2, 100, 2.0],
    [0, I.coro, N.D3, 92, 1.9], [0, I.coro, N.F3, 88, 1.9], [0, I.coro, N.A3, 86, 1.9],
    [0.05, I.cuerdas, N.F4, 84, 0.9], [0.9, I.cuerdas, N.D4, 80, 1.1],
    [0.1, I.campana, N.D4, 74, 2.0],
  ], expresion: [[I.coro, 0.4, 2.2, 120, 30]] },
  aviso_barrido: { dur: 0.70, notas: [
    // trinquete en pizzicato que acelera y sube de a semitono: marca los 0,7 s del aviso
    ...tics(0, 0.66, 0.095, 0.86, 0.028, N.A3).map(([t, n]) => [t, I.pizz, n, 92 + Math.min(30, n - N.A3) * 1.2, 0.12]),
    [0, I.tremolo, N.D3, 84, 0.7], [0, I.tremolo, N.A3, 80, 0.7],
  ], expresion: [[I.tremolo, 0, 0.68, 40, 127]] },
  barrido: { dur: 0.8, notas: [
    [0, I.trombon, N.D3, 120, 0.32], [0, I.trombon, N.A3, 114, 0.32],
    [0, I.trompa, N.D4, 112, 0.32], [0, I.trompa, N.F4, 108, 0.32],
    [0, I.timbal, N.D2, 104, 0.3],
  ] },
  campanada: { dur: 1.6, notas: [
    [0, I.campana, N.D5, 118, 1.4], [0, I.campana, N.D4, 96, 1.4], [0, I.timbal, N.D2, 92, 0.6],
  ] },
  engranaje_fijado: { dur: 0.35, notas: [
    [0, 'perc', P.maderaAguda, 118, 0.1],
    [0.07, 'perc', P.maderaGrave, 124, 0.1], [0.07, I.pizz, N.A2, 112, 0.2],
  ] },
  engranaje_disparo: { dur: 0.5, notas: [
    [0, I.trombon, N.A2, 112, 0.14], [0, I.pizz, N.A3, 110, 0.15], [0, 'perc', P.maderaGrave, 96, 0.1],
  ] },
  fase2: { dur: 2.6, notas: [
    // tics de madera que se aceleran, coro que crece, redoble de timbal, y golpe de orquesta
    ...tics(0, 1.4, 0.22, 0.83, 0.035, 0).map(([t, , i]) => [t, 'perc', i % 2 ? P.maderaGrave : P.maderaAguda, 90 + Math.min(34, i * 2.5), 0.1]),
    [0, I.coro, N.D3, 100, 1.45], [0, I.coro, N.A3, 96, 1.45], [0, I.coro, N.D4, 92, 1.45],
    ...Array.from({ length: 16 }, (_, i) => [0.85 + i * 0.0375, I.timbal, N.A1, 60 + i * 4, 0.05]),
    [1.45, I.golpeOrquesta, N.D3, 127, 0.5], [1.45, I.golpeOrquesta, N.D4, 127, 0.5],
    [1.45, I.trombon, N.D2 + 12, 124, 0.9], [1.45, I.trombon, N.A2 + 12, 120, 0.9],
    [1.45, I.trompa, N.D4, 120, 0.9], [1.45, I.trompa, N.F4, 116, 0.9],
    [1.45, I.timbal, N.D2, 124, 0.6], [1.45, 'perc', P.platillo, 118, 1.0], [1.45, I.campana, N.D4, 110, 1.1],
  ], expresion: [[I.coro, 0, 1.4, 30, 127]] },
  muerte_relojero: { dur: 3.0, notas: [
    [0, I.timbal, N.D2, 124, 0.8], [0, 'perc', P.platillo, 112, 1.5],
    ...[N.D5, N.A4, N.F4, N.D4].map((n, i) => [i * 0.38, I.campana, n, 112 - i * 8, 1.6]),
    [0, I.tremolo, N.D3, 96, 2.6], [0, I.tremolo, N.F3, 92, 2.6], [0, I.tremolo, N.A3, 90, 2.6],
    [0.2, I.coro, N.D3, 88, 2.5], [0.2, I.coro, N.A3, 84, 2.5],
  ], expresion: [[I.tremolo, 0.3, 2.8, 120, 10], [I.coro, 0.6, 2.8, 120, 20]] },
  victoria: { dur: 3.4, notas: [
    // fanfarria en RE MAYOR: la luz después de una pelea en re menor
    ...Array.from({ length: 10 }, (_, i) => [i * 0.045, I.timbal, N.A1, 70 + i * 5, 0.05]),
    [0, I.trompeta, N.A4, 112, 0.14], [0.15, I.trompeta, N.D5, 114, 0.14], [0.3, I.trompeta, N.Fs5, 118, 0.14], [0.45, I.trompeta, N.A5, 122, 1.6],
    [0.45, I.trompa, N.D4, 112, 1.9], [0.45, I.trompa, N.Fs4, 108, 1.9], [0.45, I.trompa, N.A4, 108, 1.9],
    [0.45, I.trombon, N.D3, 112, 1.9], [0.45, I.trombon, N.A3, 108, 1.9],
    [0.45, I.cuerdas, N.D4, 100, 2.4], [0.45, I.cuerdas, N.Fs4, 96, 2.4], [0.45, I.cuerdas, N.A4, 96, 2.4], [0.45, I.cuerdas, N.D5, 96, 2.4],
    [0.45, I.timbal, N.D2, 124, 0.6], [0.45, 'perc', P.platillo, 116, 1.6], [0.45, I.campana, N.D5, 104, 2.0],
  ] },
};

// ------------------------------------------------------------------ render
const banco = fs.readFileSync(rutaSf2);
const ab = banco.buffer.slice(banco.byteOffset, banco.byteOffset + banco.byteLength);

async function renderizar(capa) {
  const synth = new SpessaSynthProcessor(SR, { maxBufferSize: 128, effectsEnabled: true });
  synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(ab), 'main');
  await synth.processorInitialized;
  // un canal por instrumento (el 9 queda para percusión)
  const canales = new Map(); let libre = 0;
  const canal = (inst) => {
    if (inst === 'perc') return 9;
    if (!canales.has(inst)) {
      if (libre === 9) libre++;
      const ch = libre++;
      synth.programChange(ch, inst);
      synth.controllerChange(ch, 7, 110);
      synth.controllerChange(ch, 91, 60);
      synth.controllerChange(ch, 11, 127);
      canales.set(inst, ch);
    }
    return canales.get(inst);
  };
  synth.controllerChange(9, 7, 110); synth.controllerChange(9, 91, 50);
  const ev = [];
  for (const [t, inst, nota, vel, largo] of capa.notas) {
    const ch = canal(inst), v = Math.round(Math.max(1, Math.min(127, vel)));
    ev.push([t, 1, () => synth.noteOn(ch, nota, v)], [t + largo, 0, () => synth.noteOff(ch, nota)]);
  }
  for (const [inst, t0, t1, a, b] of capa.expresion || []) {
    const ch = canal(inst);
    for (let t = t0; t <= t1; t += 0.02) ev.push([t, 0, () => synth.controllerChange(ch, 11, Math.round(a + (b - a) * (t - t0) / (t1 - t0)))]);
  }
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const n = Math.round(capa.dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  let i = 0, e = 0;
  while (i < n) {
    while (e < ev.length && ev[e][0] * SR <= i) ev[e++][2]();
    const sig = e < ev.length ? Math.ceil(ev[e][0] * SR) : n;
    const k = Math.max(1, Math.min(128, sig - i, n - i));
    synth.process(L, R, i, k);
    i += k;
  }
  const mono = new Float32Array(n);
  let pico = 0;
  for (let k = 0; k < n; k++) { mono[k] = (L[k] + R[k]) / 2; pico = Math.max(pico, Math.abs(mono[k])); }
  return { mono, pico };
}

function escribirWav(ruta, datos) {
  const b = Buffer.alloc(44 + datos.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + datos.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(datos.length * 2, 40);
  for (let k = 0; k < datos.length; k++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, datos[k])) * 32767), 44 + k * 2);
  fs.writeFileSync(ruta, b);
}

fs.mkdirSync(SALIDA, { recursive: true });
for (const [nombre, capa] of Object.entries(CAPAS)) {
  const { mono, pico } = await renderizar(capa);
  const g = pico > 0 ? 0.9 / pico : 1;
  for (let k = 0; k < mono.length; k++) mono[k] *= g;
  escribirWav(path.join(SALIDA, `${nombre}.wav`), mono);
  console.log(`${nombre.padEnd(18)} ${capa.dur.toFixed(2)} s`);
}
