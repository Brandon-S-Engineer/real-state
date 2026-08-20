// ── Watchlist de instrumentos ────────────────────────────────────────────────
//
// Curada a mano (mismo patrón que src/content/gw2-investments.ts): un array
// tipado + helpers. No es una tabla de DB porque cambia poco y conviene tenerla
// versionada junto al código.
//
// Las claves `id` son las de dukascopy-node (verificadas contra su
// `instrumentMetaData`, no inventadas). Los campos `m1Desde` / `d1Desde` salen
// de esa misma metadata y sirven para que el backfill NUNCA pida un rango
// anterior a la existencia del dato — pedir 2003 de un índice que arranca en
// 2013 son horas de descargas vacías.
//
// Ojo con las acciones: Dukascopy las sirve como CFD y su metadata declara
// `startDayForMinuteCandles` en 2000-01-01, que es claramente un placeholder
// (las velas diarias arrancan en 2017). Por eso acá se anota la fecha REAL
// conservadora y se marca `historialDudoso`, para no construir backtests sobre
// datos que no existen.

export type ClaseActivo = 'forex' | 'metal' | 'energia' | 'indice' | 'accion'

export type Instrumento = {
  /** Clave de dukascopy-node. */
  id: string
  /** Símbolo corto para URLs y UI. */
  symbol: string
  nombre: string
  clase: ClaseActivo
  /** Decimales típicos de cotización — solo para formatear, no para almacenar. */
  digits: number
  /** Un pip en unidades de precio (0.0001 en la mayoría de FX, 0.01 en los JPY). */
  pip: number
  /** Desde cuándo hay velas de 1 minuto (metadata de Dukascopy). */
  m1Desde: string
  /** Desde cuándo hay velas diarias. */
  d1Desde: string
  /** true si la fecha de M1 que declara Dukascopy no es de fiar. */
  historialDudoso?: boolean
  /** Por qué está en la lista. */
  tesis: string
}

export const INSTRUMENTOS: Instrumento[] = [
  // ── Forex: pares mayores ──
  { id: 'eurusd', symbol: 'EURUSD', nombre: 'Euro / Dólar', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-05-04', d1Desde: '1973-03-01', tesis: 'El par más líquido del mundo. Spread mínimo y sesiones Londres/NY muy marcadas: el mejor banco de pruebas.' },
  { id: 'gbpusd', symbol: 'GBPUSD', nombre: 'Libra / Dólar', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-05-04', d1Desde: '1986-02-10', tesis: 'Más volátil que el EURUSD; rangos mayores en la sesión de Londres.' },
  { id: 'usdjpy', symbol: 'USDJPY', nombre: 'Dólar / Yen', clase: 'forex', digits: 3, pip: 0.01, m1Desde: '2003-05-04', d1Desde: '1986-02-10', tesis: 'El par de la sesión asiática; muy sensible a tasas y a flujos de refugio.' },
  { id: 'audusd', symbol: 'AUDUSD', nombre: 'Dólar australiano / Dólar', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-08-03', d1Desde: '1993-01-04', tesis: 'Proxy de materias primas y de China; se mueve en la sesión asiática.' },
  { id: 'usdcad', symbol: 'USDCAD', nombre: 'Dólar / Dólar canadiense', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-08-03', d1Desde: '1986-02-10', tesis: 'Correlación fuerte e inversa con el petróleo — sirve para estudiar pares correlacionados.' },
  { id: 'usdchf', symbol: 'USDCHF', nombre: 'Dólar / Franco suizo', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-05-04', d1Desde: '1986-02-10', tesis: 'Moneda refugio; espejo aproximado del EURUSD.' },
  { id: 'nzdusd', symbol: 'NZDUSD', nombre: 'Dólar neozelandés / Dólar', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-08-03', d1Desde: '1991-07-08', tesis: 'Primo del AUDUSD, algo menos líquido: útil para ver el costo del spread.' },

  // ── Forex: cruces ──
  { id: 'eurjpy', symbol: 'EURJPY', nombre: 'Euro / Yen', clase: 'forex', digits: 3, pip: 0.01, m1Desde: '2003-08-03', d1Desde: '1989-06-28', tesis: 'Cruce con rangos amplios; clásico de continuación de tendencia.' },
  { id: 'eurgbp', symbol: 'EURGBP', nombre: 'Euro / Libra', clase: 'forex', digits: 5, pip: 0.0001, m1Desde: '2003-08-03', d1Desde: '1995-04-14', tesis: 'Muy dado a rangos: el mejor para estudiar reversión a la media.' },
  { id: 'gbpjpy', symbol: 'GBPJPY', nombre: 'Libra / Yen', clase: 'forex', digits: 3, pip: 0.01, m1Desde: '2003-08-03', d1Desde: '1991-01-02', tesis: 'El más volátil de los cruces líquidos. Enseña gestión de riesgo a la fuerza.' },

  // ── Metales ──
  { id: 'xauusd', symbol: 'XAUUSD', nombre: 'Oro / Dólar', clase: 'metal', digits: 3, pip: 0.1, m1Desde: '2003-05-05', d1Desde: '1999-06-03', tesis: 'Refugio por excelencia, con tendencias largas y limpias. 20+ años de M1.' },
  { id: 'xagusd', symbol: 'XAGUSD', nombre: 'Plata / Dólar', clase: 'metal', digits: 3, pip: 0.01, m1Desde: '2003-05-04', d1Desde: '1999-06-03', tesis: 'La versión nerviosa del oro: mismos ciclos, el doble de volatilidad.' },

  // ── Energía ──
  { id: 'brentcmdusd', symbol: 'BRENT', nombre: 'Petróleo Brent', clase: 'energia', digits: 3, pip: 0.01, m1Desde: '2010-12-02', d1Desde: '2006-11-17', tesis: 'Estacionalidad real y shocks geopolíticos; se contrasta contra el USDCAD.' },
  { id: 'lightcmdusd', symbol: 'WTI', nombre: 'Petróleo WTI', clase: 'energia', digits: 3, pip: 0.01, m1Desde: '2011-09-23', d1Desde: '1983-04-20', tesis: 'El otro crudo de referencia; su diferencial contra el Brent es una operativa en sí misma.' },

  // ── Índices ──
  { id: 'usa500idxusd', symbol: 'SP500', nombre: 'S&P 500', clase: 'indice', digits: 2, pip: 0.1, m1Desde: '2011-09-18', d1Desde: '1980-01-02', tesis: 'El índice de referencia. Estacionalidad muy documentada y diario desde 1980.' },
  { id: 'usatechidxusd', symbol: 'NAS100', nombre: 'Nasdaq 100', clase: 'indice', digits: 2, pip: 0.1, m1Desde: '2011-09-18', d1Desde: '1990-11-07', tesis: 'La versión con beta alta del SP500; tendencias más fuertes y caídas más rápidas.' },
  { id: 'deuidxeur', symbol: 'DAX', nombre: 'DAX alemán', clase: 'indice', digits: 2, pip: 0.1, m1Desde: '2013-09-30', d1Desde: '2013-09-30', tesis: 'El índice de la sesión europea: abre con Londres y da el primer impulso del día.' },
  { id: 'jpnidxjpy', symbol: 'JPN225', nombre: 'Nikkei 225', clase: 'indice', digits: 2, pip: 1, m1Desde: '2011-09-18', d1Desde: '1986-09-04', tesis: 'Cubre la sesión asiática; muy correlacionado con el USDJPY.' },

  // ── Acciones (CFD) ──
  { id: 'aaplususd', symbol: 'AAPL', nombre: 'Apple', clase: 'accion', digits: 3, pip: 0.01, m1Desde: '2017-01-26', d1Desde: '2017-01-26', historialDudoso: true, tesis: 'Mega-cap muy líquida. Dukascopy declara M1 desde 2000 pero es un placeholder: se asume 2017.' },
  { id: 'nvdaususd', symbol: 'NVDA', nombre: 'Nvidia', clase: 'accion', digits: 3, pip: 0.01, m1Desde: '2017-01-26', d1Desde: '2017-01-26', historialDudoso: true, tesis: 'Tendencias explosivas y volatilidad alta; buen caso para estudiar momentum.' },
  { id: 'tslaususd', symbol: 'TSLA', nombre: 'Tesla', clase: 'accion', digits: 3, pip: 0.01, m1Desde: '2017-01-26', d1Desde: '2017-01-26', historialDudoso: true, tesis: 'De las más volátiles del S&P; exige stops anchos y tamaño chico.' },
  { id: 'msftususd', symbol: 'MSFT', nombre: 'Microsoft', clase: 'accion', digits: 3, pip: 0.01, m1Desde: '2017-01-26', d1Desde: '2017-01-26', tesis: 'Mega-cap estable; el contraste tranquilo frente a TSLA/NVDA.' },
]

export const TIMEFRAMES = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1'] as const
export type Timeframe = (typeof TIMEFRAMES)[number]

/** Minutos que dura cada vela — base del resampleo desde M1. */
export const TF_MINUTOS: Record<Timeframe, number> = {
  m1: 1,
  m5: 5,
  m15: 15,
  m30: 30,
  h1: 60,
  h4: 240,
  d1: 1440,
}

const porSymbol = new Map(INSTRUMENTOS.map((i) => [i.symbol.toUpperCase(), i]))

export function getInstrumento(symbol: string): Instrumento | undefined {
  return porSymbol.get(symbol.toUpperCase())
}

export function instrumentSymbols(): string[] {
  return INSTRUMENTOS.map((i) => i.symbol)
}

export function esTimeframe(v: string): v is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(v)
}
