// ── Historial diario cacheado (multi-año) ────────────────────────────────────
//
// DataWars2 expone historial diario que llega años hacia atrás. Lo usamos para
// ver el CICLO LARGO de un ítem — cómo su precio y su volumen se mueven a través
// de varios festivales. Se cachea en Gw2ItemDailyHistory y se refresca 1×/día;
// una fila por día por ítem, así que reemplazamos el set completo del ítem en
// cada refresco (barato: ~1-2k filas por ítem como mucho).

import { prisma } from '@/lib/db'
import { getItemHistoryDaily, type Datawars2HistoryRow } from './datawars2'

const REFRESH_AFTER_MS = 20 * 60 * 60 * 1000 // DataWars2 cierra el bucket diario 1×/día
const HISTORY_YEARS = 6 // suficiente para varios ciclos de cada festival

function toRow(r: Datawars2HistoryRow) {
  return {
    itemId: r.itemID,
    date: new Date(r.date),
    sold: r.sell_sold,
    bought: r.buy_sold,
    sellQuantityAvg: Math.round(r.sell_quantity_avg),
    buyQuantityAvg: Math.round(r.buy_quantity_avg),
    sellPriceAvg: Math.round(r.sell_price_avg),
    buyPriceAvg: Math.round(r.buy_price_avg),
    sampleCount: r.count,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

// Evita backfills duplicados en vuelo para el mismo ítem (varios requests casi
// simultáneos, o refrescos de fondo que se solapan).
const inFlight = new Set<number>()

/**
 * Trae/actualiza el tramo [since, hoy] del historial diario. INCREMENTAL: si
 * `since` viene, solo pide a DataWars2 desde ese día (no re-baja los años). Si
 * es null, hace el backfill largo inicial.
 */
async function refreshDaily(itemId: number, since: Date | null): Promise<void> {
  if (inFlight.has(itemId)) return
  inFlight.add(itemId)
  try {
    const start = since ?? new Date(Date.now() - HISTORY_YEARS * 365 * DAY_MS)
    let rows: ReturnType<typeof toRow>[] = []
    try {
      rows = (await getItemHistoryDaily(itemId, start)).map(toRow)
    } catch (err) {
      console.error(`daily-history: fallo al traer ${itemId}:`, err instanceof Error ? err.message : err)
      return
    }
    if (rows.length > 0) {
      // Reemplaza solo el tramo [start, hoy] — no toca los años ya guardados.
      await prisma.$transaction([
        prisma.gw2ItemDailyHistory.deleteMany({ where: { itemId, date: { gte: start } } }),
        prisma.gw2ItemDailyHistory.createMany({ data: rows.map((r) => ({ ...r, fetchedAt: new Date() })) }),
      ])
    } else if (since) {
      // Nada nuevo pero seguimos teniendo historial: bumpear el marcador para no
      // reintentar contra DataWars2 en cada request durante la ventana.
      await prisma.gw2ItemDailyHistory.updateMany({ where: { itemId, date: since }, data: { fetchedAt: new Date() } })
    }
  } finally {
    inFlight.delete(itemId)
  }
}

/**
 * Devuelve el historial diario del ítem, ordenado ascendente. Solo BLOQUEA la
 * primera vez (cuando no hay nada que mostrar y toca hacer el backfill de años).
 * Si ya hay cache pero está viejo (>REFRESH_AFTER_MS), devuelve el cache al
 * instante y dispara el refresco incremental EN SEGUNDO PLANO — así no esperás a
 * DataWars2 (que tiene ~2s de latencia fija) en cada apertura del ítem.
 */
export async function ensureDailyHistoryFresh(itemId: number) {
  const rows = await prisma.gw2ItemDailyHistory.findMany({ where: { itemId }, orderBy: { date: 'asc' } })

  if (rows.length === 0) {
    // Sin cache: no hay nada que mostrar, hay que esperar el backfill (1 vez por ítem).
    await refreshDaily(itemId, null)
    return prisma.gw2ItemDailyHistory.findMany({ where: { itemId }, orderBy: { date: 'asc' } })
  }

  const newestDate = rows[rows.length - 1].date
  const lastFetched = rows.reduce((m, r) => (r.fetchedAt > m ? r.fetchedAt : m), rows[0].fetchedAt)
  if (Date.now() - lastFetched.getTime() >= REFRESH_AFTER_MS) {
    void refreshDaily(itemId, newestDate) // fire-and-forget: el cache ya se devuelve abajo
  }
  return rows
}
