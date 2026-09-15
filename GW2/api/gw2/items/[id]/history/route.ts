import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCurrentPrices, getOrderBook } from '@/lib/gw2/prices-cache'
import { ensureMarketHistoryFresh } from '@/lib/gw2/market-history'

const LOOKBACK_DAYS = 7

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const itemId = Number(id)
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const item = await prisma.gw2Item.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: 'Ítem no encontrado en el cache' }, { status: 404 })

  // Precio y order book desde cache (rápido); refrescan en segundo plano si están viejos.
  const [priceMap, book] = await Promise.all([getCurrentPrices([itemId]), getOrderBook(itemId)])
  const cp = priceMap.get(itemId)
  const price = cp
    ? { buys: { unit_price: cp.buyPrice, quantity: cp.buyQty }, sells: { unit_price: cp.sellPrice, quantity: cp.sellQty } }
    : null

  // Historial horario (7d): leer cache; refrescar en fondo si está viejo. Solo
  // bloquea si nunca se trajo (nada que graficar todavía).
  let history = await prisma.gw2ItemMarketHistory.findMany({
    where: { itemId, periodStart: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
    orderBy: { periodStart: 'asc' },
  })
  if (history.length === 0) {
    await ensureMarketHistoryFresh([itemId])
    history = await prisma.gw2ItemMarketHistory.findMany({
      where: { itemId, periodStart: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) } },
      orderBy: { periodStart: 'asc' },
    })
  } else {
    void ensureMarketHistoryFresh([itemId]) // self-skip si <1h; si no, refresca en fondo
  }

  return NextResponse.json({ item, price, book, history })
}
