import { prisma } from '@/lib/db'
import { getCurrentPrices } from '@/lib/gw2/prices-cache'
import { GW2_EVENTS, getEventStatus, allEventItemIds, type EventItem } from '@/content/gw2-events'
import { EVENT_ECONOMICS } from '@/content/gw2-event-mechanics'
import { getFestivalCycles, cycleKey } from '@/lib/gw2/festival-cache'
import { bandVerdict, festivalAction } from '@/lib/gw2/festival-cycle'
import EventosClient, { type EventView, type EventItemRow, type EventGroupView } from '@/components/gw2/eventos-client'

export const dynamic = 'force-dynamic'

const TP_CUT = 0.15

export default async function EventosPage() {
  const now = new Date()
  const ids = allEventItemIds()

  const [items, priceById, cycles] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, icon: true, rarity: true, type: true } }),
    getCurrentPrices(ids),
    getFestivalCycles(),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))

  const toRow = (ei: EventItem, slug: string, ctx: { isActive: boolean; daysUntilNext: number }): EventItemRow => {
    const item = itemById.get(ei.id)
    const price = priceById.get(ei.id)
    const bid = price?.buyPrice ?? 0
    const ask = price?.sellPrice ?? 0
    const spread = ask - bid
    const profitFlip = bid > 0 ? Math.round(ask * (1 - TP_CUT) - bid) : 0
    const stat = cycles.get(cycleKey(slug, ei.id)) ?? null
    const band = stat ? bandVerdict(bid, stat) : null
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
      cycle: stat
        ? {
            play: stat.play,
            festivalEffect: stat.festivalEffect,
            medianNetRatio: stat.medianNetRatio,
            yearsPositive: stat.yearsPositive,
            yearsTotal: stat.yearsTotal,
            medianMonthsToPeak: stat.medianMonthsToPeak,
            typicalSellMonth: stat.typicalSellMonth,
            lastFestAvg: stat.lastFestAvg,
            band,
            years: stat.years,
            curve: stat.curve,
            action: festivalAction(stat, { ...ctx, band, currentBid: bid }),
          }
        : null,
    }
  }

  const events: EventView[] = GW2_EVENTS.map((ev) => {
    const st = getEventStatus(ev, now)
    const ctx = { isActive: st.status === 'activo', daysUntilNext: st.daysUntilNext }
    const groups: EventGroupView[] = ev.groups.map((g) => ({ label: g.label, note: g.note ?? null, rows: g.items.map((i) => toRow(i, ev.slug, ctx)) }))
    const econ = EVENT_ECONOMICS[ev.slug] ?? null

    // Los mejores candidatos del festival, medidos: solo los que de verdad
    // pagaron comprando durante el evento, ordenados por retorno neto.
    const allRows = groups.flatMap((g) => g.rows)
    const buyPicks = allRows
      .filter((r) => r.cycle && r.cycle.play === 'comprar-en-festival' && r.cycle.medianNetRatio > 1.05 && r.cycle.yearsPositive >= Math.ceil(r.cycle.yearsTotal / 2))
      .sort((a, b) => (b.cycle!.medianNetRatio - a.cycle!.medianNetRatio))
      .slice(0, 6)
    // Ordenadas por ORO por unidad, no por porcentaje: un +30% sobre un mat de
    // 97c rinde menos que un +16% sobre un ecto de 30s, y rankear por % pondría
    // primero al peor negocio.
    const sellPicks = allRows
      .filter((r) => r.cycle && r.cycle.play === 'vender-hacia-festival' && (r.cycle.action?.gainPerUnit ?? 0) > 0)
      .sort((a, b) => (b.cycle!.action!.gainPerUnit - a.cycle!.action!.gainPerUnit))
      .slice(0, 6)

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
      economics: econ,
      buyPicks,
      sellPicks,
    }
  })

  return <EventosClient events={events} />
}
