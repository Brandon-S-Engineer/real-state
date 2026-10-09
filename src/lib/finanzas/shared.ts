// Finanzas: tipos, catálogos y cálculos puros (se usan en server y cliente).

import { z } from 'zod'

export const AREAS = ['REVENTA', 'SOFTWARE', 'OTRO'] as const
export type Area = (typeof AREAS)[number]
export const AREA_LABEL: Record<Area, string> = { REVENTA: 'Reventa', SOFTWARE: 'Software', OTRO: 'Otro' }

export const KINDS = ['INGRESO', 'EGRESO'] as const
export type Kind = (typeof KINDS)[number]

// Sugerencias (el campo es libre). Las compras/ventas de equipos van en "Mis trades".
export const CATEGORY_SUGGESTIONS: Record<Area, Record<Kind, string[]>> = {
  REVENTA: {
    INGRESO: ['Venta de equipo', 'Venta de piezas', 'Reparación a terceros', 'Otro'],
    EGRESO: ['Compra de equipo', 'Lote B-Stock', 'Envío / importación', 'Impuestos / agente aduanal', 'Anuncios Facebook', 'Transporte', 'Fotos / material', 'Reparación / refacciones', 'Otro'],
  },
  SOFTWARE: {
    INGRESO: ['Upwork', 'Cliente directo', 'Agentes / automatizaciones', 'Otro'],
    EGRESO: ['Comisión Upwork / Connects', 'Herramientas / suscripciones', 'Hosting / APIs', 'Otro'],
  },
  OTRO: {
    INGRESO: ['Otro'],
    EGRESO: ['Renta', 'Servicios', 'Otro'],
  },
}

export const entrySchema = z.object({
  date: z.coerce.date(),
  kind: z.enum(KINDS),
  area: z.enum(AREAS),
  category: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  fxRate: z.number().positive().default(1),
  note: z.string().nullable().optional(),
})

export type FinanceEntryDTO = {
  id: string
  date: string // YYYY-MM-DD
  kind: Kind
  area: Area
  category: string
  amount: number
  currency: 'MXN' | 'USD'
  fxRate: number
  amountMxn: number
  note: string | null
}

/** Trade de equipo ya resumido: la ganancia cuenta en el mes en que se vendió. */
export type TradeLite = { buyDate: string; sellDate: string | null; profit: number | null; invested: number }

export const monthKey = (iso: string) => iso.slice(0, 7) // "2026-09"

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

export function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type MonthSummary = {
  key: string
  byArea: Record<Area, { ingresos: number; egresos: number; neto: number }>
  trades: { profit: number; sold: number }
  neto: number
}

export function summarizeMonth(key: string, entries: FinanceEntryDTO[], trades: TradeLite[]): MonthSummary {
  const byArea = Object.fromEntries(AREAS.map((a) => [a, { ingresos: 0, egresos: 0, neto: 0 }])) as MonthSummary['byArea']
  for (const e of entries) {
    if (monthKey(e.date) !== key) continue
    const bucket = byArea[e.area]
    if (e.kind === 'INGRESO') bucket.ingresos += e.amountMxn
    else bucket.egresos += e.amountMxn
  }
  const sold = trades.filter((t) => t.sellDate && t.profit != null && monthKey(t.sellDate) === key)
  const tradeProfit = sold.reduce((a, t) => a + t.profit!, 0)
  for (const a of AREAS) byArea[a].neto = byArea[a].ingresos - byArea[a].egresos
  byArea.REVENTA.neto += tradeProfit
  return { key, byArea, trades: { profit: tradeProfit, sold: sold.length }, neto: AREAS.reduce((s, a) => s + byArea[a].neto, 0) }
}

// ── Metas de referencia (estimaciones, octubre 2026) ─────────────────────────
// Todo desde Polanco: el vendedor y el comprador vienen a ti (cero tráfico).
// iPhone 15/16 a ~$10.5k de costo promedio; compra ≤ P25, venta ≈ P75.
// Anuncios de Facebook (~$150/pieza) ya descontados del neto. El capital es
// lo que hay que tener rotando (stock) para sostener ese volumen a 7–10 días.

export type GoalRow = { from: number; to: number | null; etapa: string; volumen: string; detalle: string; capital: string; netoMes: string; freno: string; min: number; max: number }

export const GOAL_TABLES: { id: string; title: string; meta: string; nota: string; detalleLabel: string; rows: GoalRow[] }[] = [
  {
    id: 'individual',
    title: 'Tabla 1 · Individual (tú, todo desde Polanco)',
    meta: 'Meta: ~$100,000 / mes desde el mes 5',
    detalleLabel: 'Neto por pieza',
    nota: 'El techo es tu tiempo: cada venta son 2 encuentros (compra + venta). 50 ventas ≈ 3–4 encuentros al día sin salir de Polanco, además del software. Del mes 5 en adelante tu perfil de vendedor ya tiene calificaciones y vendes en P75 o arriba sin regatear tanto.',
    rows: [
      { from: 1, to: 1, etapa: 'Mes 1 · prueba', volumen: '5–8 ventas', detalle: '~$1,500', capital: '$25k', netoMes: '$8k–12k', freno: 'Capital de prueba, aprender', min: 8000, max: 12000 },
      { from: 2, to: 2, etapa: 'Mes 2', volumen: '20–30 ventas', detalle: '~$1,800', capital: '~$150k (entra inversión)', netoMes: '$36k–54k', freno: 'Perfil nuevo, sin calificaciones', min: 36000, max: 54000 },
      { from: 3, to: 4, etapa: 'Meses 3–4', volumen: '35–45 ventas', detalle: '~$2,000', capital: '~$200k', netoMes: '$70k–90k', freno: 'Encontrar compras buenas', min: 70000, max: 90000 },
      { from: 5, to: null, etapa: 'Mes 5+', volumen: '45–55 ventas', detalle: '~$2,200', capital: '~$250k', netoMes: '$100k–120k', freno: 'Tu tiempo (~4 encuentros/día)', min: 100000, max: 120000 },
    ],
  },
  {
    id: 'equipo',
    title: 'Tabla 2 · Equipo (tú, tu hermano y tu mamá · Polanco, Interlomas, Santa Fe)',
    meta: 'Meta: ~$250,000 / mes desde el mes 5 (entre los 3)',
    detalleLabel: 'Neto por pieza',
    nota: 'Cada quien con su zona y su propio perfil de vendedor (3 perfiles = 3 veces el alcance en Marketplace). Neto del equipo antes de repartir. El freno pasa a ser capital y conseguir ~5 compras buenas al día: en CDMX desaparecen ~110 iPhones seguidos al día, 140 ventas al mes es una fracción chica. Capital: se reinvierte la ganancia de los meses 2–4.',
    rows: [
      { from: 1, to: 1, etapa: 'Mes 1 · prueba', volumen: '5–8 ventas (tú)', detalle: '~$1,500', capital: '$25k', netoMes: '$8k–12k', freno: 'Validar mercado', min: 8000, max: 12000 },
      { from: 2, to: 2, etapa: 'Mes 2', volumen: '30–45 ventas', detalle: '~$1,700', capital: '~$200k (entra inversión)', netoMes: '$50k–75k', freno: 'Que aprendan a comprar', min: 50000, max: 75000 },
      { from: 3, to: 4, etapa: 'Meses 3–4', volumen: '70–90 ventas', detalle: '~$1,900', capital: '~$300k', netoMes: '$130k–170k', freno: 'Capital', min: 130000, max: 170000 },
      { from: 5, to: null, etapa: 'Mes 5+', volumen: '110–140 ventas', detalle: '~$2,100', capital: '~$450k', netoMes: '$230k–290k', freno: 'Capital y compras buenas (~5/día)', min: 230000, max: 290000 },
    ],
  },
]

/** Mes del negocio (1 = el primer mes con actividad de reventa). */
export function businessMonth(startKey: string | null, key: string): number {
  if (!startKey) return 1
  const [ys, ms] = startKey.split('-').map(Number)
  const [y, m] = key.split('-').map(Number)
  return Math.max(1, (y - ys) * 12 + (m - ms) + 1)
}

export const rowFor = (rows: GoalRow[], n: number) => rows.find((r) => n >= r.from && (r.to == null || n <= r.to))
