// ── Cliente de DataWars2 (api.datawars2.ie) ───────────────────────────────────
//
// La API oficial de GW2 solo da estado actual del TP — nada de Sold/Bought
// histórico (confirmado contra wiki.guildwars2.com/wiki/API:2/commerce/listings:
// solo expone buys/sells con quantity y unit_price, sin campos de volumen).
//
// DataWars2 es un proyecto comunitario gratis y sin API key que sí calcula y
// guarda esas métricas, muestreando el TP oficial con mucha más frecuencia
// (~350 muestras/día, cada ~4 min) de lo que este proyecto necesitaría para
// arrancar. Documentación: https://gitlab.com/Silvers_Gw2/Market_Data_Processer
//
// No hay rate limit documentado, pero por buena vecindad los requests van
// secuenciales con un respiro chico entre cada uno — no es una API dedicada a
// alto volumen como la oficial.

const DATAWARS2_BASE = 'https://api.datawars2.ie/gw2/v2'

export interface Datawars2HistoryRow {
  itemID: number
  date: string // ISO — inicio del bucket
  type: 'hour' | 'day'
  count: number // muestras agregadas en este bucket
  buy_sold: number
  sell_sold: number
  buy_listed: number
  sell_listed: number
  buy_delisted: number
  sell_delisted: number
  buy_quantity_avg: number
  sell_quantity_avg: number
  buy_price_avg: number
  sell_price_avg: number
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Historial por hora de un ítem — DataWars2 solo mantiene ~1 semana a esta
 * resolución (más atrás, usar getItemHistoryDaily). Sin `end`, trae hasta hoy.
 */
export async function getItemHistoryHourly(itemId: number, start: Date, end: Date = new Date()): Promise<Datawars2HistoryRow[]> {
  const url = `${DATAWARS2_BASE}/history/hourly/json?itemID=${itemId}&start=${toDateParam(start)}&end=${toDateParam(end)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DataWars2 API ${res.status} en /history/hourly/json (itemID=${itemId})`)
  const data = (await res.json()) as Datawars2HistoryRow[]
  return Array.isArray(data) ? data : []
}

/** Historial diario — cubre años hacia atrás, útil para backfill largo (ej. Festivales en fases futuras). */
export async function getItemHistoryDaily(itemId: number, start: Date, end: Date = new Date()): Promise<Datawars2HistoryRow[]> {
  const url = `${DATAWARS2_BASE}/history/json?itemID=${itemId}&start=${toDateParam(start)}&end=${toDateParam(end)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DataWars2 API ${res.status} en /history/json (itemID=${itemId})`)
  const data = (await res.json()) as Datawars2HistoryRow[]
  return Array.isArray(data) ? data : []
}

export interface Datawars2BulkPrice {
  id: number
  buy_price: number | null
  buy_quantity: number | null
  sell_price: number | null
  sell_quantity: number | null
}

/**
 * Precios actuales de TODO el TP en UN solo request (~28k ítems, ~2.4MB). Es la
 * pieza que permite que las páginas carguen rápido: en vez de pegarle a la API
 * oficial en vivo por cada render, se toma este snapshot y se cachea en DB.
 */
export async function getAllCurrentPrices(): Promise<Datawars2BulkPrice[]> {
  const url = `${DATAWARS2_BASE.replace('/v2', '/v1')}/items/json?fields=id,buy_price,sell_price,buy_quantity,sell_quantity`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DataWars2 API ${res.status} en /v1/items/json (bulk prices)`)
  const data = (await res.json()) as Datawars2BulkPrice[]
  return Array.isArray(data) ? data : []
}

// Concurrencia al traer historial de muchos ítems. DataWars2 no documenta un
// rate limit; 10 en paralelo es un balance entre velocidad y buena vecindad.
// Secuencial (1×/vez) hacía que un scan de 3000 ítems tardara ~30 min; con pool
// baja a un par de minutos.
const HISTORY_CONCURRENCY = 10

/** Trae historial por hora para varios ítems, en paralelo con un pool acotado. */
export async function getItemsHistoryHourly(itemIds: number[], start: Date, end: Date = new Date()): Promise<Map<number, Datawars2HistoryRow[]>> {
  const out = new Map<number, Datawars2HistoryRow[]>()
  let cursor = 0

  async function worker() {
    while (cursor < itemIds.length) {
      const id = itemIds[cursor++]
      try {
        out.set(id, await getItemHistoryHourly(id, start, end))
      } catch (err) {
        console.error(`DataWars2: fallo al traer historial de ${id}:`, err instanceof Error ? err.message : err)
        out.set(id, [])
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(HISTORY_CONCURRENCY, itemIds.length) }, worker))
  return out
}
