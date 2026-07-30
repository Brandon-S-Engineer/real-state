// ── Cache de precios actuales + order book ───────────────────────────────────
//
// El truco de por qué las páginas cargan rápido: NO se le pega a la API en vivo
// por cada render. Un snapshot de todo el TP (1 request bulk a DataWars2) se
// guarda en Gw2CurrentPrice y las páginas leen de la DB (instantáneo). El
// snapshot se refresca en segundo plano con un TTL corto — el usuario nunca
// espera al fetch salvo el primer arranque con la tabla vacía.
//
// El order book (profundidad) sí necesita la API oficial (DataWars2 no da
// profundidad), pero solo se usa en el detalle de un ítem y se cachea per-ítem
// con el mismo patrón read-through + refresh de fondo.

import { prisma } from '@/lib/db'
import { getAllCurrentPrices } from './datawars2'
import { getListingsByIds, type Gw2Listing, type Gw2Price } from './client'

const PRICE_TTL_MS = 5 * 60 * 1000 // el TP no se mueve tanto en 5 min; suficiente para "en vivo"
const BOOK_TTL_MS = 3 * 60 * 1000

let snapshotInFlight = false
const bookInFlight = new Set<number>()

export type CurrentPrice = { itemId: number; buyPrice: number; buyQty: number; sellPrice: number; sellQty: number }

// ── Snapshot de precios (todo el TP) ─────────────────────────────────────────

async function refreshPriceSnapshot(): Promise<void> {
  if (snapshotInFlight) return
  snapshotInFlight = true
  try {
    const bulk = await getAllCurrentPrices()
    const rows = bulk.filter((b) => (b.buy_price ?? 0) > 0 || (b.sell_price ?? 0) > 0)
    if (rows.length === 0) return

    const now = new Date().toISOString()
    // Upsert crudo por chunks: evita la ventana vacía de delete+insert y es
    // rápido (una sola sentencia multi-fila por chunk). Los valores son enteros
    // de la API → seguros de interpolar.
    const CHUNK = 2000
    for (let i = 0; i < rows.length; i += CHUNK) {
      const values = rows
        .slice(i, i + CHUNK)
        .map((b) => `(${b.id},${Math.round(b.buy_price ?? 0)},${Math.round(b.buy_quantity ?? 0)},${Math.round(b.sell_price ?? 0)},${Math.round(b.sell_quantity ?? 0)},'${now}')`)
        .join(',')
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Gw2CurrentPrice" ("itemId","buyPrice","buyQty","sellPrice","sellQty","fetchedAt")
         VALUES ${values}
         ON CONFLICT ("itemId") DO UPDATE SET
           "buyPrice"=EXCLUDED."buyPrice","buyQty"=EXCLUDED."buyQty",
           "sellPrice"=EXCLUDED."sellPrice","sellQty"=EXCLUDED."sellQty",
           "fetchedAt"=EXCLUDED."fetchedAt"`,
      )
    }
  } catch (err) {
    console.error('prices-cache: fallo al refrescar snapshot:', err instanceof Error ? err.message : err)
  } finally {
    snapshotInFlight = false
  }
}

/**
 * Asegura que el snapshot esté fresco. Si está vacío BLOQUEA para el primer
 * arranque; si solo está viejo, dispara el refresco en segundo plano y sigue.
 */
async function ensureSnapshotFresh(): Promise<void> {
  const meta = await prisma.gw2CurrentPrice.aggregate({ _max: { fetchedAt: true }, _count: true })
  if (meta._count === 0) {
    await refreshPriceSnapshot()
  } else if (Date.now() - (meta._max.fetchedAt?.getTime() ?? 0) >= PRICE_TTL_MS) {
    void refreshPriceSnapshot()
  }
}

/**
 * Precios actuales de los ítems dados, leídos del snapshot en DB. Si está viejo
 * (>TTL) refresca en segundo plano y devuelve lo cacheado igual. Solo BLOQUEA si
 * la tabla está vacía (primer arranque).
 */
export async function getCurrentPrices(ids: number[]): Promise<Map<number, CurrentPrice>> {
  if (ids.length === 0) return new Map()
  await ensureSnapshotFresh()
  const rows = await prisma.gw2CurrentPrice.findMany({ where: { itemId: { in: ids } } })
  return new Map(rows.map((r) => [r.itemId, { itemId: r.itemId, buyPrice: r.buyPrice, buyQty: r.buyQty, sellPrice: r.sellPrice, sellQty: r.sellQty }]))
}

function toGw2Price(r: { itemId: number; buyPrice: number; buyQty: number; sellPrice: number; sellQty: number }): Gw2Price {
  return { id: r.itemId, whitelisted: true, buys: { unit_price: r.buyPrice, quantity: r.buyQty }, sells: { unit_price: r.sellPrice, quantity: r.sellQty } }
}

/**
 * Snapshot de precios en el MISMO formato que `getPricesByIds` (API oficial),
 * para que los scans lean de la DB sin cambiar su lógica. Sin `ids` devuelve
 * TODO el TP (reemplaza a getTradeableItemIds + getPricesByIds(28k), que tarda
 * ~75s, por una lectura de DB de ~2s).
 */
export async function getPricesSnapshot(ids?: number[]): Promise<Gw2Price[]> {
  await ensureSnapshotFresh()
  const rows = ids && ids.length
    ? await prisma.gw2CurrentPrice.findMany({ where: { itemId: { in: ids } } })
    : await prisma.gw2CurrentPrice.findMany()
  return rows.map(toGw2Price)
}

// ── Order book por ítem ──────────────────────────────────────────────────────

async function refreshOrderBook(itemId: number): Promise<void> {
  if (bookInFlight.has(itemId)) return
  bookInFlight.add(itemId)
  try {
    const [book] = await getListingsByIds([itemId])
    if (!book) return
    await prisma.gw2OrderBook.upsert({
      where: { itemId },
      create: { itemId, buys: book.buys, sells: book.sells },
      update: { buys: book.buys, sells: book.sells, fetchedAt: new Date() },
    })
  } catch (err) {
    console.error(`prices-cache: fallo al refrescar order book ${itemId}:`, err instanceof Error ? err.message : err)
  } finally {
    bookInFlight.delete(itemId)
  }
}

/** Order book cacheado del ítem. Bloquea solo si no hay nada; si no, bg refresh. */
export async function getOrderBook(itemId: number): Promise<{ buys: Gw2Listing['buys']; sells: Gw2Listing['sells'] } | null> {
  let row = await prisma.gw2OrderBook.findUnique({ where: { itemId } })

  if (!row) {
    await refreshOrderBook(itemId)
    row = await prisma.gw2OrderBook.findUnique({ where: { itemId } })
  } else if (Date.now() - row.fetchedAt.getTime() >= BOOK_TTL_MS) {
    void refreshOrderBook(itemId)
  }

  if (!row) return null
  return { buys: row.buys as Gw2Listing['buys'], sells: row.sells as Gw2Listing['sells'] }
}
