// ── Cache del historial diario de Unidentified ───────────────────────────────
//
// La página de Unidentified se auto-refresca cada minuto para tener PRECIOS
// frescos. Pero además necesita historial diario (banda de 90 días + ciclo
// semanal de 2 años) de ~19 ítems: son ~10.500 filas y ~2 segundos de consulta.
//
// Ese historial lo cierra DataWars2 una vez al día, así que volver a pedirlo en
// cada refresco de un minuto sería castigar a Neon para recibir exactamente el
// mismo resultado 60 veces por hora. Se cachea en memoria con TTL de horas.
//
// Los PRECIOS no pasan por acá: siguen pidiéndose en vivo en cada carga, que es
// justamente lo que hace útil el auto-refresco.

import { prisma } from '@/lib/db'

const TTL_MS = 6 * 60 * 60 * 1000
const HISTORY_DAYS = 780 // banda de 90d + ciclo semanal de 2 años

export type FilaHistorial = { date: Date; buyPriceAvg: number; sellPriceAvg: number; sold: number; bought: number }

let cache: { at: number; map: Map<number, FilaHistorial[]> } | null = null
let inFlight: Promise<Map<number, FilaHistorial[]>> | null = null

async function cargar(ids: number[]): Promise<Map<number, FilaHistorial[]>> {
  const rows = await prisma.gw2ItemDailyHistory.findMany({
    where: { itemId: { in: ids }, date: { gte: new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) } },
    select: { itemId: true, date: true, buyPriceAvg: true, sellPriceAvg: true, sold: true, bought: true },
    orderBy: { date: 'asc' },
  })
  const map = new Map<number, FilaHistorial[]>()
  for (const r of rows) {
    let arr = map.get(r.itemId)
    if (!arr) {
      arr = []
      map.set(r.itemId, arr)
    }
    arr.push({ date: r.date, buyPriceAvg: r.buyPriceAvg, sellPriceAvg: r.sellPriceAvg, sold: r.sold, bought: r.bought })
  }
  return map
}

/**
 * Historial diario por ítem. Sirve de cache si está fresco; si está viejo lo
 * devuelve igual al instante y refresca en segundo plano, para que el
 * auto-refresco de la página nunca se quede esperando los ~2s de la consulta.
 */
export async function getUnidHistory(ids: number[]): Promise<Map<number, FilaHistorial[]>> {
  const fresco = cache && Date.now() - cache.at < TTL_MS

  if (cache && fresco) return cache.map

  const refrescar = () => {
    if (!inFlight) {
      inFlight = cargar(ids)
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

  if (cache) {
    void refrescar() // viejo pero usable: se sirve ya y se actualiza atrás
    return cache.map
  }
  return refrescar() // primera vez: no hay nada que mostrar, toca esperar
}
