// ── Escáner de mercado completo (2 etapas) ────────────────────────────────────
//
// Alimenta "Grandes Spreads" (flipping) y "Demanda Subiendo" (momentum) desde
// una sola tabla rica. El problema de escala: la API oficial da estado actual
// de los ~28k ítems barato (~140 requests), pero el volumen real (Sold/Bought)
// viene de DataWars2, 1 request por ítem. Así que:
//
//   Etapa 1 — precios actuales de TODO el mercado. Filtra a los ítems con
//             mercado de dos lados (bid, ask, supply, demand > 0) y rankea por
//             un proxy de actividad. Toma un shortlist.
//   Etapa 2 — para el shortlist, ingiere el historial de DataWars2 y calcula
//             volumen real, oro potencial por día y la señal de demanda subiendo.
//
// El resultado se cachea en Gw2MarketOpportunity; la UI lee instantáneo.

import { prisma } from '@/lib/db'
import type { Gw2Price } from './client'
import { getPricesSnapshot } from './prices-cache'
import { ensureMarketHistoryFresh } from './market-history'

const TP_CUT = 0.15
const SHORTLIST_SIZE = 2000 // acotado para no re-llenar Neon (512 MB) y que el refill de historial sea más rápido
const MIN_FLUJO_DIARIO = 10 // sold+bought/día mínimo para considerar que hay transacciones reales
const RECENT_HOURS = 24 // ventana "reciente" para la señal de demanda
const HISTORY_CHUNK = 400

// Evita que varios "Recalcular" seguidos disparen refrescos de historial
// solapados (cada uno recorre miles de ítems contra DataWars2).
let historyRefreshInFlight = false
async function backgroundRefreshHistory(ids: number[]): Promise<void> {
  if (historyRefreshInFlight) return
  historyRefreshInFlight = true
  try {
    await ensureMarketHistoryFresh(ids)
  } catch (err) {
    console.error('market-scan: fallo en refresco de historial de fondo:', err instanceof Error ? err.message : err)
  } finally {
    historyRefreshInFlight = false
  }
}

interface Stage1 {
  itemId: number
  bid: number
  ask: number
  spread: number
  spreadPct: number
  supply: number
  demand: number
  profitFlip: number
  roiFlip: number
  proxy: number
}

function runStage1(prices: Gw2Price[]): Stage1[] {
  const out: Stage1[] = []
  for (const p of prices) {
    const bid = p.buys?.unit_price ?? 0
    const ask = p.sells?.unit_price ?? 0
    const supply = p.sells?.quantity ?? 0
    const demand = p.buys?.quantity ?? 0
    if (bid <= 0 || ask <= 0 || supply <= 0 || demand <= 0) continue // mercado de un solo lado = fuera

    const spread = ask - bid
    const profitFlip = Math.round(ask * (1 - TP_CUT) - bid)
    out.push({
      itemId: p.id,
      bid,
      ask,
      spread,
      spreadPct: spread / bid,
      supply,
      demand,
      profitFlip,
      roiFlip: profitFlip / bid,
      // Proxy de actividad usando stock actual como aproximación de volumen —
      // se reemplaza por volumen real en la etapa 2. Combina margen y liquidez
      // de dos lados para no traer ni spreads muertos ni volumen sin margen.
      proxy: Math.max(profitFlip, 1) * Math.min(supply, demand),
    })
  }
  // Los mejores por proxy de oro potencial — cubre tanto flipping como
  // candidatos a demanda subiendo (mercados activos de dos lados).
  return out.sort((a, b) => b.proxy - a.proxy).slice(0, SHORTLIST_SIZE)
}

type HistRow = { periodStart: Date; sold: number; bought: number; sellPriceAvg: number; buyQuantityAvg: number; sellQuantityAvg: number }

function computeFromHistory(rows: HistRow[]) {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())

  const totalSold = sorted.reduce((s, r) => s + r.sold, 0)
  const totalBought = sorted.reduce((s, r) => s + r.bought, 0)
  const days = new Set(sorted.map((r) => r.periodStart.toISOString().slice(0, 10))).size || 1
  const soldDiario = totalSold / days
  const boughtDiario = totalBought / days

  const cutoff = Date.now() - RECENT_HOURS * 60 * 60 * 1000
  const recent = sorted.filter((r) => r.periodStart.getTime() >= cutoff)
  const baseline = sorted.filter((r) => r.periodStart.getTime() < cutoff)

  const avg = (arr: HistRow[], sel: (r: HistRow) => number) => (arr.length ? arr.reduce((s, r) => s + sel(r), 0) / arr.length : 0)

  const recentDemand = avg(recent, (r) => r.buyQuantityAvg)
  const baseDemand = avg(baseline, (r) => r.buyQuantityAvg)
  const demandChangePct = baseDemand > 0 && recent.length > 0 ? (recentDemand - baseDemand) / baseDemand : 0

  const recentPrice = avg(recent, (r) => r.sellPriceAvg)
  const basePrice = avg(baseline, (r) => r.sellPriceAvg)
  const priceChangePct = basePrice > 0 && recent.length > 0 ? (recentPrice - basePrice) / basePrice : 0

  return { soldDiario, boughtDiario, demandChangePct, priceChangePct }
}

export async function runMarketScan(): Promise<{ scanned: number; shortlisted: number; stored: number }> {
  // Recalcular computa desde CACHE (rápido): precios del snapshot + historial ya
  // guardado. No baja nada en vivo en el camino del botón. Al final dispara el
  // refresco de historial EN SEGUNDO PLANO para que el próximo scan sea más rico
  // — así "Recalcular" tarda segundos, no minutos, y el volumen (dato de
  // movimiento lento) se va poniendo al día solo.
  const prices = await getPricesSnapshot()
  const stage1 = runStage1(prices)
  const shortlistIds = stage1.map((s) => s.itemId)

  // Historial ya cacheado del shortlist, en pocas queries (no una por ítem).
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const historyByItem = new Map<number, HistRow[]>()
  for (let i = 0; i < shortlistIds.length; i += HISTORY_CHUNK) {
    const chunk = shortlistIds.slice(i, i + HISTORY_CHUNK)
    const rows = await prisma.gw2ItemMarketHistory.findMany({
      where: { itemId: { in: chunk }, periodStart: { gte: since } },
      select: { itemId: true, periodStart: true, sold: true, bought: true, sellPriceAvg: true, buyQuantityAvg: true, sellQuantityAvg: true },
    })
    for (const r of rows) {
      const arr = historyByItem.get(r.itemId) ?? []
      arr.push(r)
      historyByItem.set(r.itemId, arr)
    }
  }

  const stored: {
    itemId: number; bid: number; ask: number; spread: number; spreadPct: number
    supply: number; demand: number; soldDiario: number; boughtDiario: number; flujoDiario: number
    diasParaVender: number | null; profitFlip: number; roiFlip: number; oroPotencialDiario: number
    demandChangePct: number; priceChangePct: number
  }[] = []

  for (const s of stage1) {
    const hist = computeFromHistory(historyByItem.get(s.itemId) ?? [])
    if (!hist) continue // sin historial todavía — se descarta, no se adivina

    const flujoDiario = hist.soldDiario + hist.boughtDiario
    if (flujoDiario < MIN_FLUJO_DIARIO) continue // sin transacciones reales = ruido

    const oroPotencialDiario = Math.round(s.profitFlip * Math.min(hist.soldDiario, hist.boughtDiario))
    const diasParaVender = hist.soldDiario > 0 ? s.supply / hist.soldDiario : null

    stored.push({
      itemId: s.itemId,
      bid: s.bid,
      ask: s.ask,
      spread: s.spread,
      spreadPct: s.spreadPct,
      supply: s.supply,
      demand: s.demand,
      soldDiario: hist.soldDiario,
      boughtDiario: hist.boughtDiario,
      flujoDiario,
      diasParaVender,
      profitFlip: s.profitFlip,
      roiFlip: s.roiFlip,
      oroPotencialDiario,
      demandChangePct: hist.demandChangePct,
      priceChangePct: hist.priceChangePct,
    })
  }

  await prisma.$transaction([
    prisma.gw2MarketOpportunity.deleteMany({}),
    prisma.gw2MarketOpportunity.createMany({ data: stored.map((s) => ({ ...s, computedAt: new Date() })) }),
  ])

  // Refresco de historial en segundo plano (no bloquea el botón). Guarda contra
  // solaparse si el usuario aprieta Recalcular varias veces seguidas.
  void backgroundRefreshHistory(shortlistIds)

  return { scanned: stage1.length, shortlisted: shortlistIds.length, stored: stored.length }
}
