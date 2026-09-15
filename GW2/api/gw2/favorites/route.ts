import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPricesSnapshot } from '@/lib/gw2/prices-cache'

const TP_CUT = 0.15

// GET → favoritos. Con ?idsOnly=1 devuelve solo [{itemId}] sin precios (lo que
// necesita el store de estrellas, barato). Sin el flag, trae precios del
// snapshot (rápido, sin pegarle a la API oficial en vivo) para la página de
// Favoritos: spread/flip actual de cada uno.
export async function GET(req: Request) {
  const favorites = await prisma.gw2Favorite.findMany({ orderBy: { createdAt: 'desc' } })
  if (favorites.length === 0) return NextResponse.json([])

  const idsOnly = new URL(req.url).searchParams.get('idsOnly')
  if (idsOnly) return NextResponse.json(favorites.map((f) => ({ itemId: f.itemId })))

  const itemIds = favorites.map((f) => f.itemId)
  const [items, prices] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: itemIds } } }),
    getPricesSnapshot(itemIds),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))
  const priceById = new Map(prices.map((p) => [p.id, p]))

  const rows = favorites.map((f) => {
    const item = itemById.get(f.itemId)
    const price = priceById.get(f.itemId)
    const bid = price?.buys?.unit_price ?? 0
    const ask = price?.sells?.unit_price ?? 0
    const spread = ask - bid
    const profitFlip = bid > 0 ? Math.round(ask * (1 - TP_CUT) - bid) : 0
    return {
      itemId: f.itemId,
      note: f.note,
      name: item?.name ?? `#${f.itemId}`,
      icon: item?.icon ?? null,
      rarity: item?.rarity ?? '',
      bid,
      ask,
      spread,
      spreadPct: bid > 0 ? spread / bid : 0,
      profitFlip,
      roiFlip: bid > 0 ? profitFlip / bid : 0,
      supply: price?.sells?.quantity ?? 0,
      demand: price?.buys?.quantity ?? 0,
    }
  })
  return NextResponse.json(rows)
}

const postSchema = z.object({ itemId: z.number().int(), note: z.string().max(300).optional() })

export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const fav = await prisma.gw2Favorite.upsert({
    where: { itemId: parsed.data.itemId },
    create: parsed.data,
    update: { note: parsed.data.note },
  })
  return NextResponse.json(fav, { status: 201 })
}
