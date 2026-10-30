/**
 * Análisis numérico: ¿se puede cruzar el anillo (y la aguja) rodando?
 *
 * La "banda de peligro" es el grosor del anillo + el diámetro del jugador:
 * mientras el centro del jugador esté dentro de esa banda, hay contacto.
 * Margen de esquiva = invulnerabilidad − tiempo que tardas en cruzar la banda.
 *
 * tests/juego.test.ts compara esta fórmula con la simulación real del juego
 * (≈630 ms para pulsar con los valores por defecto). Rodar de lado casi nunca
 * funciona porque te alejas del centro a la vez que el anillo.
 */
import { CONFIG_JUEGO } from '../../config/juego.ts';
import { CONFIG_JUGADOR } from '../../config/jugador.ts';
import { CONFIG_RELOJERO } from './config.ts';
import { DEG } from '../../nucleo/utilidades.ts';

export interface FilaAnalisis {
  fase: number;
  velocidadAnillo: number;
  bandaPeligro_px: number;
  distanciaEnInvulnerabilidad_px: number;
  margen_rodandoHaciaElJefe_s: number;
  ventana_pulsacion_s: number;
  margen_rodandoAlejandote_s: number | 'imposible';
}

export interface ResultadoAnalisis {
  lineas: string[];
  tabla: FilaAnalisis[];
  problemas: boolean;
}

export function analizarRelojero(): ResultadoAnalisis {
  const J = CONFIG_JUGADOR, R = J.rodada, Rel = CONFIG_RELOJERO;
  const A = Rel.campanada, F2 = Rel.fase2, B = Rel.barrido;
  const paso = CONFIG_JUEGO.simulacion.paso, margen = CONFIG_JUEGO.analisis.margenMinimoRodada;
  const lineas: string[] = [], tabla: FilaAnalisis[] = [];
  let problemas = false;

  if (R.inicioInvulnerabilidad + R.invulnerabilidad > R.duracion) {
    lineas.push('⚠ La invulnerabilidad dura más que la rodada: parte de los i-frames ocurre caminando.');
    problemas = true;
  }

  for (const [fase, mult] of [[1, 1], [2, F2.multVelocidadAnillo]] as const) {
    const v = A.velocidad * mult;
    const banda = A.grosor + 2 * J.radio + v * paso; // + lo que avanza el anillo en un paso de física
    const tHacia = banda / (R.velocidad + v);
    const tAfuera = R.velocidad > v ? banda / (R.velocidad - v) : Infinity;
    const vHacia = R.invulnerabilidad - tHacia;                   // margen en "momento de tocar el anillo"
    const vPulsar = Math.max(0, vHacia) * (R.velocidad + v) / v;  // el mismo margen, en "momento de pulsar"
    const vAfuera = R.invulnerabilidad - tAfuera;
    tabla.push({
      fase, velocidadAnillo: v, bandaPeligro_px: +banda.toFixed(1),
      distanciaEnInvulnerabilidad_px: +(R.velocidad * R.invulnerabilidad).toFixed(1),
      margen_rodandoHaciaElJefe_s: +vHacia.toFixed(3),
      ventana_pulsacion_s: +vPulsar.toFixed(3),
      margen_rodandoAlejandote_s: isFinite(vAfuera) ? +vAfuera.toFixed(3) : 'imposible',
    });
    lineas.push(`Anillo fase ${fase}: banda ${banda.toFixed(1)}px · rodando hacia el jefe: margen ${(vHacia * 1000).toFixed(0)}ms (≈${(vPulsar * 1000).toFixed(0)}ms para pulsar) · alejándote ${isFinite(vAfuera) ? (vAfuera * 1000).toFixed(0) + 'ms' : 'imposible'} · de lado no sirve`);
    if (vHacia < margen) {
      lineas.push(`⚠ Fase ${fase}: cruzar el anillo rodando deja menos de ${margen * 1000}ms de margen. Baja el grosor/velocidad del anillo o sube la invulnerabilidad.`);
      problemas = true;
    }
  }

  const w = (B.arco * DEG) / B.duracion;
  const dCerca = Rel.radio + J.radio;
  const tAguja = (2 * J.radio + B.grosorAguja) / (w * dCerca);
  lineas.push(`Aguja: ${(B.arco / B.duracion).toFixed(0)}°/s · tarda ${(tAguja * 1000).toFixed(0)}ms en cruzarte pegado al jefe · margen ${((R.invulnerabilidad - tAguja) * 1000).toFixed(0)}ms`);

  return { lineas, tabla, problemas };
}
