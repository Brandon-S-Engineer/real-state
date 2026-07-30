import { prisma } from '@/lib/db'
import { getCurrentPrices } from '@/lib/gw2/prices-cache'
import { GW2_EVENTS, getEventStatus, allEventItemIds, type EventItem } from '@/content/gw2-events'
import EventosClient, { type EventView, type EventItemRow, type EventGroupView } from '@/components/gw2/eventos-client'

export const dynamic = 'force-dynamic'

const TP_CUT = 0.15

export default async function EventosPage() {
  const now = new Date()
  const ids = allEventItemIds()

  const [items, priceById] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, icon: true, rarity: true, type: true } }),
    getCurrentPrices(ids),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))

  const toRow = (ei: EventItem): EventItemRow => {
    const item = itemById.get(ei.id)
    const price = priceById.get(ei.id)
    const bid = price?.buyPrice ?? 0
    const ask = price?.sellPrice ?? 0
    const spread = ask - bid
    const profitFlip = bid > 0 ? Math.round(ask * (1 - TP_CUT) - bid) : 0
    return {
      itemId: ei.id,
      name: item?.name ?? `#${ei.id}`,
      icon: item?.icon ?? null,
      rarity: item?.rarity ?? '',
      type: item?.type ?? '',
      note: ei.note ?? null,
      bid,
      ask,
      spread,
      spreadPct: bid > 0 ? spread / bid : 0,
      profitFlip,
      supply: price?.sellQty ?? 0,
      demand: price?.buyQty ?? 0,
    }
  }

  const events: EventView[] = GW2_EVENTS.map((ev) => {
    const st = getEventStatus(ev, now)
    const groups: EventGroupView[] = ev.groups.map((g) => ({ label: g.label, note: g.note ?? null, rows: g.items.map(toRow) }))
    return {
      slug: ev.slug,
      name: ev.name,
      emoji: ev.emoji,
      location: ev.location,
      confirmed: ev.confirmed,
      blurb: ev.blurb,
      strategy: ev.strategy,
      status: st.status,
      daysUntilNext: st.daysUntilNext,
      windowStart: st.windowStart.toISOString(),
      windowEnd: st.windowEnd.toISOString(),
      nextStart: st.nextStart.toISOString(),
      itemCount: groups.reduce((n, g) => n + g.rows.length, 0),
      groups,
    }
  })

  return <EventosClient events={events} />
}
