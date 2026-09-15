import { prisma } from '@/lib/db'
import { getItemsHistoryHourly, type Datawars2HistoryRow } from './datawars2'

const REFRESH_AFTER_MS = 60 * 60 * 1000 // DataWars2 actualiza por hora — no tiene sentido pedir más seguido
const LOOKBACK_DAYS = 7 // ventana que expone el endpoint hourly de DataWars2
const PRUNE_KEEP_DAYS = 8 // se conserva la ventana + 1 día de colchón; lo más viejo se poda
const PRUNE_INTERVAL_MS = 30 * 60 * 1000

// Esta tabla es un cache de ventana móvil (7 días). Como el shortlist de items
// cambia entre scans, sin poda las filas viejas se acumulan sin límite (llegó a
// 1.4M filas / 413 MB y llenó Neon). Se podan las filas fuera de la ventana;
// throttle para no correr el DELETE en cada request.
let lastPruneAt = 0
async function pruneOldMarketHistory() {
  if (Date.now() - lastPruneAt < PRUNE_INTERVAL_MS) return
  lastPruneAt = Date.now()
  const cutoff = new Date(Date.now() - PRUNE_KEEP_DAYS * 24 * 60 * 60 * 1000)
  try {
    const { count } = await prisma.gw2ItemMarketHistory.deleteMany({ where: { periodStart: { lt: cutoff } } })
    if (count > 0) console.log(`market-history: podadas ${count} filas > ${PRUNE_KEEP_DAYS}d`)
  } catch (err) {
    console.error('market-history: fallo al podar:', err instanceof Error ? err.message : err)
  }
}

function toRow(r: Datawars2HistoryRow) {
  return {
    itemId: r.itemID,
    periodStart: new Date(r.date),
    sold: r.sell_sold,
    bought: r.buy_sold,
    sellListed: r.sell_listed,
    buyListed: r.buy_listed,
    sellDelisted: r.sell_delisted,
    buyDelisted: r.buy_delisted,
    sellQuantityAvg: Math.round(r.sell_quantity_avg),
    buyQuantityAvg: Math.round(r.buy_quantity_avg),
    sellPriceAvg: Math.round(r.sell_price_avg),
    buyPriceAvg: Math.round(r.buy_price_avg),
    sampleCount: r.count,
    source: 'datawars2',
  }
}

/**
 * Refresca el historial (fuente DataWars2) de los ítems dados, solo si lo que
 * tenemos guardado tiene más de una hora — evita pegarle a la API en cada
 * request de un usuario navegando la UI.
 */
export async function ensureMarketHistoryFresh(itemIds: number[]): Promise<void> {
  if (itemIds.length === 0) return

  const latestByItem = await prisma.gw2ItemMarketHistory.groupBy({
    by: ['itemId'],
    where: { itemId: { in: itemIds }, source: 'datawars2' },
    _max: { periodStart: true },
  })
  const latestMap = new Map(latestByItem.map((r) => [r.itemId, r._max.periodStart]))

  const now = Date.now()
  const staleIds = itemIds.filter((id) => {
    const latest = latestMap.get(id)
    return !latest || now - latest.getTime() > REFRESH_AFTER_MS
  })
  if (staleIds.length === 0) return

  const start = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const historyByItem = await getItemsHistoryHourly(staleIds, start)

  const rows = Array.from(historyByItem.values()).flat().map(toRow)
  if (rows.length === 0) return

  await prisma.gw2ItemMarketHistory.createMany({ data: rows, skipDuplicates: true })
  await pruneOldMarketHistory() // mantiene la tabla acotada a la ventana móvil
}

/**
 * Promedio de Sold/Bought por día en base al historial guardado (cualquier
 * fuente). null si no hay historial — se descarta en vez de adivinar, mismo
 * espíritu que los gates del brief.
 */
export async function getDailyFlowAverages(itemId: number): Promise<{ soldDiario: number; boughtDiario: number } | null> {
  const rows = await prisma.gw2ItemMarketHistory.findMany({
    where: { itemId, periodStart: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
  })
  if (rows.length === 0) return null

  const totalSold = rows.reduce((sum, r) => sum + r.sold, 0)
  const totalBought = rows.reduce((sum, r) => sum + r.bought, 0)
  const days = new Set(rows.map((r) => r.periodStart.toISOString().slice(0, 10))).size || 1
  return { soldDiario: totalSold / days, boughtDiario: totalBought / days }
}

/** Atajo para cuando solo hace falta Sold (ej. liquidez de salida del Extractor). */
export async function getSoldDiarioPromedio(itemId: number): Promise<number | null> {
  const avg = await getDailyFlowAverages(itemId)
  return avg?.soldDiario ?? null
}

export function computeLiquidezDias(supplyActual: number | null | undefined, soldDiario: number | null): number | null {
  if (soldDiario == null || soldDiario <= 0) return null
  if (supplyActual == null) return null
  return supplyActual / soldDiario
}
