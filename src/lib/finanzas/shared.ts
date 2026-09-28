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

// ── Metas de referencia (estimaciones, septiembre 2026) ──────────────────────
// Vives frente a Polanco (ventas de 30–45 min) y compras en BJ/Centro vía metro.
// Anuncios de Facebook (~$150/pieza) ya descontados del neto.

export type GoalRow = { from: number; to: number | null; etapa: string; volumen: string; detalle: string; netoMes: string; freno: string; min: number; max: number }

export const GOAL_TABLES: { id: string; title: string; meta: string; nota: string; detalleLabel: string; rows: GoalRow[] }[] = [
  {
    id: 'local',
    title: 'Tabla 1 · Sin B-Stock (todo local)',
    meta: 'Meta: ~$80,000 / mes',
    detalleLabel: 'Neto por pieza',
    nota: 'El techo es tu tiempo: cada venta necesita su compra (~4 encuentros al día arriba de 50 ventas/mes).',
    rows: [
      { from: 1, to: 2, etapa: 'Meses 1–2', volumen: '12–20 ventas', detalle: '~$1,300', netoMes: '$16k–26k', freno: 'Aprender, sin ratings', min: 16000, max: 26000 },
      { from: 3, to: 4, etapa: 'Meses 3–4', volumen: '30–40 ventas', detalle: '~$1,700', netoMes: '$50k–68k', freno: 'Encontrar compras buenas', min: 50000, max: 68000 },
      { from: 5, to: null, etapa: 'Mes 5+', volumen: '40–50 ventas', detalle: '~$1,900', netoMes: '$75k–95k', freno: 'Tu tiempo', min: 75000, max: 95000 },
    ],
  },
  {
    id: 'bstock',
    title: 'Tabla 2 · Con B-Stock desde el mes 3',
    meta: 'Meta: $100,000 / mes hacia el mes 5',
    detalleLabel: 'Capital (reinvirtiendo)',
    nota: 'Supuestos: ~$2,500 neto por pieza de B-Stock, ~$9k de costo, ~6 semanas de lote a venta, reinvirtiendo todo. Al inicio frena el capital; al final, tu capacidad de vender (~4 al día).',
    rows: [
      { from: 1, to: 2, etapa: 'Meses 1–2', volumen: '12–20 local', detalle: '~$1,300', netoMes: '$16k–26k', freno: 'Aprender', min: 16000, max: 26000 },
      { from: 3, to: 4, etapa: 'Meses 3–4', volumen: '~15 B-Stock + ~30 local', detalle: 'capital ~$230k', netoMes: '$80k–95k', freno: 'Capital', min: 80000, max: 95000 },
      { from: 5, to: 6, etapa: 'Meses 5–6', volumen: '~28 B-Stock + ~25 local', detalle: 'capital ~$400k', netoMes: '$110k–125k', freno: 'Capital', min: 110000, max: 125000 },
      { from: 7, to: 8, etapa: 'Meses 7–8', volumen: '~45 B-Stock + ~20 local', detalle: 'capital ~$650k', netoMes: '$145k–160k', freno: 'Capital', min: 145000, max: 160000 },
      { from: 9, to: null, etapa: 'Mes 9+', volumen: '60–70 B-Stock + ~15 local', detalle: 'capital ~$900k', netoMes: '$180k–210k', freno: 'Tu tiempo (~80–90 ventas)', min: 180000, max: 210000 },
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
