// ── Indicadores ──────────────────────────────────────────────────────────────
//
// Funciones puras sobre `Bar[]`. Devuelven un array de la MISMA longitud que la
// entrada, con `null` en las posiciones donde el indicador todavía no tiene
// suficiente historial. Ese `null` es deliberado: es la misma disciplina de
// `price-band.ts` (devolver null en vez de adivinar), y evita el error clásico
// de dibujar una media de 200 sobre las primeras 199 velas.

import type { Bar } from './bars'

export type Serie = (number | null)[]

/** Media móvil simple. */
export function sma(bars: Bar[], period: number): Serie {
  const out: Serie = new Array(bars.length).fill(null)
  if (period <= 0) return out
  let sum = 0
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].c
    if (i >= period) sum -= bars[i - period].c
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

/**
 * Media móvil exponencial. Se siembra con la SMA del primer tramo (no con el
 * primer cierre): sembrar con un solo precio hace que la EMA arranque torcida y
 * tarde decenas de velas en converger.
 */
export function ema(bars: Bar[], period: number): Serie {
  const out: Serie = new Array(bars.length).fill(null)
  if (period <= 0 || bars.length < period) return out
  const k = 2 / (period + 1)
  let seed = 0
  for (let i = 0; i < period; i++) seed += bars[i].c
  let prev = seed / period
  out[period - 1] = prev
  for (let i = period; i < bars.length; i++) {
    prev = bars[i].c * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/**
 * Average True Range (Wilder). El True Range usa el cierre ANTERIOR, no solo el
 * rango de la vela — si no, los huecos de apertura (fines de semana en FX)
 * quedarían invisibles justo cuando más importan para dimensionar el stop.
 */
export function atr(bars: Bar[], period = 14): Serie {
  const out: Serie = new Array(bars.length).fill(null)
  if (bars.length < period + 1) return out
  const tr: number[] = new Array(bars.length).fill(0)
  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].c
    tr[i] = Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - prevClose), Math.abs(bars[i].l - prevClose))
  }
  let sum = 0
  for (let i = 1; i <= period; i++) sum += tr[i]
  let prev = sum / period
  out[period] = prev
  for (let i = period + 1; i < bars.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period // suavizado de Wilder, no SMA
    out[i] = prev
  }
  return out
}

/** RSI de Wilder. */
export function rsi(bars: Bar[], period = 14): Serie {
  const out: Serie = new Array(bars.length).fill(null)
  if (bars.length < period + 1) return out
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const d = bars[i].c - bars[i - 1].c
    if (d >= 0) gains += d
    else losses -= d
  }
  let avgG = gains / period
  let avgL = losses / period
  out[period] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL)
  for (let i = period + 1; i < bars.length; i++) {
    const d = bars[i].c - bars[i - 1].c
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period
    out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL)
  }
  return out
}

export type Bandas = { media: Serie; alta: Serie; baja: Serie }

/** Bandas de Bollinger (SMA ± n desviaciones estándar). */
export function bollinger(bars: Bar[], period = 20, mult = 2): Bandas {
  const media = sma(bars, period)
  const alta: Serie = new Array(bars.length).fill(null)
  const baja: Serie = new Array(bars.length).fill(null)
  for (let i = period - 1; i < bars.length; i++) {
    const m = media[i]
    if (m == null) continue
    let acc = 0
    for (let j = i - period + 1; j <= i; j++) acc += (bars[j].c - m) ** 2
    const sd = Math.sqrt(acc / period)
    alta[i] = m + mult * sd
    baja[i] = m - mult * sd
  }
  return { media, alta, baja }
}

/** Catálogo de superposiciones que la gráfica sabe dibujar sobre el precio. */
export const OVERLAYS = [
  { key: 'ema20', label: 'EMA 20', color: '#2a78d6', fn: (b: Bar[]) => ema(b, 20) },
  { key: 'ema50', label: 'EMA 50', color: '#eb6834', fn: (b: Bar[]) => ema(b, 50) },
  { key: 'ema200', label: 'EMA 200', color: '#8b5cf6', fn: (b: Bar[]) => ema(b, 200) },
] as const

export type OverlayKey = (typeof OVERLAYS)[number]['key']
