// ── Cache de ciclos de festival ──────────────────────────────────────────────
//
// Calcular los ciclos exige leer el historial diario de los ~80 ítems de evento:
// unas 167k filas, ~5s. Inaceptable en cada carga de página, pero el resultado
// cambia como mucho 1×/día (que es cada cuánto DataWars2 cierra el bucket
// diario). Así que se cachean las ESTADÍSTICAS (objetos chicos), no el historial
// (decenas de MB): se carga una vez, se computa, y se sirve de memoria.
//
// El precio actual NO entra acá: cambia todo el tiempo y se compara contra la
// banda cacheada con `bandVerdict()` en cada request.

import { prisma } from '@/lib/db'
import { GW2_EVENTS } from '@/content/gw2-events'
import { ensureDailyHistoryFresh } from './daily-history'
import { analyzeFestivalCycle, type FestivalCycleStat } from './festival-cycle'

const TTL_MS = 6 * 60 * 60 * 1000
const HISTORY_YEARS = 5 // 4-5 ciclos completos: suficiente para una mediana sólida

/** Clave `${slug}:${itemId}` — un ítem puede pertenecer a más de un festival. */
export type FestivalCycleMap = Map<string, FestivalCycleStat>

export const cycleKey = (slug: string, itemId: number) => `${slug}:${itemId}`

let cache: { at: number; map: FestivalCycleMap } | null = null
let inFlight: Promise<FestivalCycleMap> | null = null

async function computeAll(): Promise<FestivalCycleMap> {
  const ids = Array.from(new Set(GW2_EVENTS.flatMap((e) => e.groups.flatMap((g) => g.items.map((i) => i.id)))))
  const since = new Date(Date.now() - HISTORY_YEARS * 365 * 24 * 60 * 60 * 1000)

  const rows = await prisma.gw2ItemDailyHistory.findMany({
    where: { itemId: { in: ids }, date: { gte: since } },
    select: { itemId: true, date: true, buyPriceAvg: true, sellPriceAvg: true },
    orderBy: { date: 'asc' },
  })

  const byItem = new Map<number, { date: Date; buyPriceAvg: number; sellPriceAvg: number }[]>()
  for (const r of rows) {
    let arr = byItem.get(r.itemId)
    if (!arr) {
      arr = []
      byItem.set(r.itemId, arr)
    }
    arr.push({ date: r.date, buyPriceAvg: r.buyPriceAvg, sellPriceAvg: r.sellPriceAvg })
  }

  // Ítems recién agregados al contenido (p. ej. infusiones nuevas) todavía no
  // tienen historial. Se dispara el backfill en segundo plano para que el
  // próximo refresco ya los pueda analizar, sin bloquear esta carga.
  const missing = ids.filter((id) => !byItem.has(id))
  for (const id of missing) void ensureDailyHistoryFresh(id)
  if (missing.length) console.log(`festival-cache: backfill en curso para ${missing.length} ítem(s) sin historial`)

  const map: FestivalCycleMap = new Map()
  for (const ev of GW2_EVENTS) {
    for (const g of ev.groups) {
      for (const it of g.items) {
        const hist = byItem.get(it.id)
        if (!hist) continue
        const stat = analyzeFestivalCycle(hist, ev.window)
        if (stat) map.set(cycleKey(ev.slug, it.id), stat)
      }
    }
  }
  return map
}

/**
 * Devuelve los ciclos de todos los ítems de festival. Sirve de cache si está
 * fresco; si no, computa (deduplicando llamadas concurrentes). Si ya hay un
 * cache viejo se devuelve al instante y se refresca en segundo plano, para no
 * pagar los ~5s en la carga del usuario.
 */
export async function getFestivalCycles(): Promise<FestivalCycleMap> {
  const fresh = cache && Date.now() - cache.at < TTL_MS
  if (cache && fresh) return cache.map

  if (cache && !fresh) {
    // Cache viejo: devolvelo ya y refrescá atrás.
    if (!inFlight) {
      inFlight = computeAll()
        .then((map) => {
          cache = { at: Date.now(), map }
          return map
        })
        .finally(() => {
          inFlight = null
        })
    }
    return cache.map
  }

  // Sin cache: hay que esperar (una sola vez por proceso).
  if (!inFlight) {
    inFlight = computeAll()
      .then((map) => {
        cache = { at: Date.now(), map }
        return map
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
