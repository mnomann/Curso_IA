"""
Generador de efectos de sonido de El Relojero Sin Hora.

Cada efecto mezcla dos tipos de capa:
  - Capas ORQUESTALES (herramientas/capas/*.wav): los mismos instrumentos y la misma
    tonalidad (re) que la música de pelea, para que los efectos suenen como parte de ella.
    Se generan con capas_orquestales.mjs (banco GeneralUser GS).
  - Capas SINTÉTICAS (este archivo): silbidos, resortes y chasquidos que la orquesta
    no tiene, hechos desde cero con ruido filtrado y síntesis FM.

Las señales del jefe y las del jugador usan sonidos distintos a propósito: la campana
es exclusiva de la campanada; los golpes del jugador usan pizzicato y madera.

Uso (desde la carpeta del proyecto):
    npm run audio:capas -- ruta/GeneralUser-GS.sf2   (solo si cambias las capas)
    pip install numpy scipy
    python herramientas/generar_sonidos.py
Necesita ffmpeg para exportar a MP3.
"""
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve

SR = 44100
rng = np.random.default_rng(11)
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sonidos')
CAPAS = os.path.join(os.path.dirname(__file__), 'capas')


def capa(nombre):
    """Capa orquestal renderizada por capas_orquestales.mjs (mono, float)."""
    sr, x = wavfile.read(os.path.join(CAPAS, nombre + '.wav'))
    assert sr == SR, f'{nombre}: frecuencia de muestreo {sr}'
    return x.astype(float) / 32768


# ------------------------------------------------------------------ bloques básicos
def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(dur, ataque=0.003, caida=0.2):
    """Ataque lineal corto y caída exponencial (tiempo hasta -60 dB ~ 7*caida)."""
    t = t_(dur)
    a = np.clip(t / max(ataque, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - ataque, 0) / caida)


def env_adsr(dur, a, d, s, r):
    t = t_(dur)
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    fin = dur - r
    return e * np.clip((dur - t) / r, 0, 1) if r > 0 else e


def osc_seno(frec):
    """Seno con frecuencia variable en el tiempo (array de Hz, una por muestra)."""
    fase = np.cumsum(np.asarray(frec, dtype=float) / SR) * 2 * np.pi
    return np.sin(fase)


def fm(dur, portadora, ratio, indice, caida_indice=0.2, glide=None):
    """Síntesis FM: el índice decae, lo que da un ataque brillante y una cola suave (campanas)."""
    t = t_(dur)
    fc = np.full_like(t, portadora) if glide is None else glide(t)
    fm_ = fc * ratio
    idx = indice * np.exp(-t / caida_indice)
    mod = np.sin(np.cumsum(fm_ / SR) * 2 * np.pi) * idx
    return np.sin(np.cumsum(fc / SR) * 2 * np.pi + mod)


def ruido(dur):
    return rng.standard_normal(int(dur * SR))


def filtro_svf(x, frec, q=1.0, tipo='bp'):
    """Filtro de estado variable (TPT) con frecuencia que puede cambiar en el tiempo."""
    frec = np.broadcast_to(np.asarray(frec, dtype=float), x.shape)
    g = np.tan(np.pi * np.clip(frec, 20, SR * 0.45) / SR)
    k = 1.0 / q
    ic1 = ic2 = 0.0
    y = np.empty_like(x)
    for n in range(len(x)):
        gn = g[n]
        a1 = 1 / (1 + gn * (gn + k)); a2 = gn * a1; a3 = gn * a2
        v3 = x[n] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        y[n] = v1 * k if tipo == 'bp' else (v2 if tipo == 'lp' else x[n] - k * v1 - v2)
    return y


def curva(dur, *puntos):
    """Interpola una curva por puntos (tiempo relativo 0..1, valor), en escala logarítmica."""
    t = np.linspace(0, 1, int(dur * SR))
    xs = [p[0] for p in puntos]; ys = np.log([p[1] for p in puntos])
    return np.exp(np.interp(t, xs, ys))


def reverb(x, largo=0.9, mezcla=0.22, brillo=4000):
    """Reverberación simple: convolución con ruido que decae, filtrado para que no chille."""
    n = int(largo * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (largo / 6.9))
    ir = filtro_svf(ir, brillo, 0.7, 'lp')
    ir /= np.sqrt(np.sum(ir ** 2))
    humedo = np.pad(fftconvolve(x, ir), (0, 1))[: len(x) + n]
    seco = np.pad(x, (0, n))
    return seco * (1 - mezcla) + humedo * mezcla


def mezclar(*capas):
    n = max(len(c) for c in capas)
    out = np.zeros(n)
    for c in capas:
        out[: len(c)] += c
    return out


def en(dur, x, desde=0.0):
    """Coloca x dentro de un buffer de 'dur' segundos, desde el segundo 'desde'."""
    out = np.zeros(int(dur * SR))
    i = int(desde * SR)
    out[i: i + len(x)] = x[: max(0, len(out) - i)]
    return out


def tic(frec=2600, q=8, caida=0.012, nivel=1.0):
    """Clic resonante: impulso de ruido por un pasabanda angosto + un brillo FM mínimo."""
    d = max(0.06, caida * 7)
    x = filtro_svf(ruido(d) * env_exp(d, 0.0005, caida * 0.4), frec, q, 'bp') * 3
    x += fm(d, frec * 0.5, 1.41, 2.0, 0.01) * env_exp(d, 0.0005, caida) * 0.25
    return x * nivel


def terminar(x, dur, pico=0.89, fundido=0.03, satur=1.2):
    """Recorta a 'dur', satura suave, normaliza y hace fundido final. Sin silencio inicial."""
    x = x[: int(dur * SR)]
    if len(x) < int(dur * SR):
        x = np.pad(x, (0, int(dur * SR) - len(x)))
    # quita cualquier silencio inicial (umbral -50 dB)
    umbral = np.max(np.abs(x)) * 10 ** (-50 / 20)
    inicio = np.argmax(np.abs(x) > umbral)
    x = x[inicio:]
    x = np.tanh(x / np.max(np.abs(x)) * satur) / np.tanh(satur)
    f = int(fundido * SR)
    x[-f:] *= np.linspace(1, 0, f)
    return x / np.max(np.abs(x)) * pico


def nivel_percibido(x):
    """Aproximación al volumen percibido: realce de agudos, corte de graves y RMS máximo en 100 ms (dB)."""
    from scipy.signal import butter, sosfilt
    k = sosfilt(butter(2, 100, 'hp', fs=SR, output='sos'), x) + 0.6 * sosfilt(butter(1, 1500, 'hp', fs=SR, output='sos'), x)
    w = int(0.1 * SR)
    return 20 * np.log10(np.sqrt(np.convolve(k ** 2, np.ones(w) / w, 'valid')).max() + 1e-9)


def nivelar(x, objetivo_db, techo=0.95):
    """Ajusta la ganancia hasta el volumen objetivo; si el pico se pasa, lo limita suave (tanh)."""
    for _ in range(4):
        x = x * 10 ** ((objetivo_db - nivel_percibido(x)) / 20)
        if np.max(np.abs(x)) > techo:
            x = np.tanh(x / techo) * techo
    return x


# ------------------------------------------------------------------ sonidos del jugador
def jugador_ataque():
    """Silbido de espada: sintético (la orquesta no tiene un "swish")."""
    d = 0.28
    sweep = curva(d, (0, 700), (0.35, 2600), (1, 1500))
    silbido = filtro_svf(ruido(d), sweep, 2.5, 'bp') * env_adsr(d, 0.03, 0.06, 0.5, 0.17)
    filo = osc_seno(curva(d, (0, 1700), (1, 2500))) * env_exp(d, 0.03, 0.05) * 0.10
    return terminar(reverb(silbido + filo, 0.4, 0.12), d, pico=0.62)


def jugador_impacto():
    """Pizzicato fuerte + madera + timbal, con un chasquido corto encima."""
    d = 0.45
    chasquido = filtro_svf(ruido(d), 3200, 1.2, 'bp') * env_exp(d, 0.0005, 0.006) * 0.35
    return terminar(mezclar(capa('impacto'), chasquido), d, pico=0.85, satur=1.4)


def jugador_rodada():
    """Roce de tela y aire: sintético y discreto (se repite mucho)."""
    d = 0.38
    sweep = curva(d, (0, 260), (0.45, 900), (1, 300))
    x = filtro_svf(ruido(d), sweep, 1.4, 'bp') * env_adsr(d, 0.05, 0.1, 0.55, 0.2)
    sub = osc_seno(curva(d, (0, 90), (1, 60))) * env_adsr(d, 0.04, 0.1, 0.4, 0.2) * 0.3
    return terminar(x + sub, d, pico=0.55)


def jugador_curacion():
    """Arpa en re mayor + celesta: la única luz en una pelea en re menor."""
    d = 1.3
    brillo = filtro_svf(ruido(d), curva(d, (0, 3000), (1, 9000)), 4, 'bp') * env_adsr(d, 0.2, 0.3, 0.2, 0.5) * 0.06
    return terminar(mezclar(capa('curacion'), brillo), d, pico=0.6, fundido=0.3)


def jugador_herido():
    """Metales en segunda menor (disonancia) + timbal y bombo, con un golpe sordo."""
    d = 0.55
    golpe = osc_seno(curva(d, (0, 160), (0.3, 70), (1, 55))) * env_exp(d, 0.001, 0.08) * 0.5
    return terminar(mezclar(capa('herido'), golpe), d, pico=0.8, satur=1.5, fundido=0.1)


def jugador_muerte():
    """Coro en re menor que se apaga, timbal, contrabajo y una campana grave."""
    return terminar(capa('muerte_jugador'), 2.3, pico=0.8, fundido=0.4)


# ------------------------------------------------------------------ sonidos del Relojero
def relojero_aviso_barrido():
    """Trinquete en pizzicato que acelera y sube durante los 0,7 s del aviso, sobre cuerdas en trémolo."""
    return terminar(capa('aviso_barrido'), 0.70, pico=0.8, fundido=0.01)


def relojero_barrido():
    """Golpe de metales con el aire de la aguja barriendo."""
    d = 0.7
    sweep = curva(d, (0, 250), (0.45, 1300), (1, 380))
    aire = filtro_svf(ruido(d), sweep, 1.8, 'bp') * env_adsr(d, 0.03, 0.15, 0.7, 0.3) * 0.6
    return terminar(reverb(mezclar(capa('barrido'), aire), 0.5, 0.1), d, pico=0.85, satur=1.4, fundido=0.15)


def relojero_campanada():
    """La misma campana tubular de la música, en re, con timbal."""
    return terminar(capa('campanada'), 1.5, pico=0.9, fundido=0.25)


def relojero_engranaje_fijado():
    """Madera aguda y grave ("encaja, se traba") con pizzicato."""
    return terminar(capa('engranaje_fijado'), 0.3, pico=0.8)


def relojero_engranaje_disparo():
    """Golpe corto de trombón y pizzicato, con el silbido y el zumbido de la rueda."""
    d = 0.5
    salida = filtro_svf(ruido(d), curva(d, (0, 3500), (1, 900)), 2, 'bp') * env_exp(d, 0.001, 0.06) * 0.7
    giro = fm(d, 0, 1, 1, 1, glide=lambda t: 520 - 260 * (t / d)) * env_adsr(d, 0.005, 0.05, 0.6, 0.35) * 0.15
    return terminar(mezclar(capa('engranaje_disparo'), salida, giro), d, pico=0.75)


def relojero_fase2():
    """Tics de madera que se aceleran, coro creciendo, redoble y golpe de orquesta con platillo."""
    return terminar(capa('fase2'), 2.5, pico=0.9, fundido=0.35)


def relojero_muerte():
    """Campanas descendentes, trémolo que se apaga, y resortes que saltan."""
    d = 2.9
    resortes = np.zeros(int(d * SR))
    for i in range(5):
        dd = 0.35
        f = rng.uniform(500, 900)
        r = fm(dd, 0, 1, 1, 1, glide=lambda t, f=f: f * np.exp(-t * 6)) * env_exp(dd, 0.002, 0.08)
        resortes += en(d, r * 0.3, i * 0.11 + rng.uniform(0, 0.04))
    return terminar(mezclar(capa('muerte_relojero'), resortes), d, pico=0.85, fundido=0.5)


# ------------------------------------------------------------------ interfaz
def ui_victoria():
    """Fanfarria en re mayor: trompetas, metales, cuerdas, timbal y campana."""
    return terminar(capa('victoria'), 3.3, pico=0.75, fundido=0.6)


# archivo: (función, volumen percibido objetivo en dB)
# Los avisos van más fuerte (el jugador TIENE que oírlos); lo que se repite mucho, más bajo.
SONIDOS = {
    'jugador/ataque.mp3': (jugador_ataque, -12),
    'jugador/impacto.mp3': (jugador_impacto, -10),
    'jugador/rodada.mp3': (jugador_rodada, -13),
    'jugador/curacion.mp3': (jugador_curacion, -10),
    'jugador/herido.mp3': (jugador_herido, -9),
    'jugador/muerte.mp3': (jugador_muerte, -10),
    'jefes/relojero/aviso-barrido.mp3': (relojero_aviso_barrido, -9),
    'jefes/relojero/barrido.mp3': (relojero_barrido, -9),
    'jefes/relojero/campanada.mp3': (relojero_campanada, -8),
    'jefes/relojero/engranaje-fijado.mp3': (relojero_engranaje_fijado, -9),
    'jefes/relojero/engranaje-disparo.mp3': (relojero_engranaje_disparo, -11),
    'jefes/relojero/fase2.mp3': (relojero_fase2, -8),
    'jefes/relojero/muerte.mp3': (relojero_muerte, -9),
    'ui/victoria.mp3': (ui_victoria, -9),
}


def exportar(x, ruta):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        wavfile.write(tmp.name, SR, (x * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name,
                    '-codec:a', 'libmp3lame', '-b:a', '128k', ruta], check=True)
    os.remove(tmp.name)


if __name__ == '__main__':
    for nombre, (fn, objetivo) in SONIDOS.items():
        x = nivelar(fn(), objetivo)
        exportar(x, os.path.join(SALIDA, nombre))
        print(f'{nombre:40s} {len(x) / SR:5.2f} s  {nivel_percibido(x):6.1f} dB  pico {np.max(np.abs(x)):.2f}')
