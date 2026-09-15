import { prisma } from '@/lib/db'
import { getCurrentPrices } from '@/lib/gw2/prices-cache'
import { GW2_EVENTS, getEventStatus } from '@/content/gw2-events'
import { formatCopper } from '@/lib/gw2/format'
import FavoritosClient from '@/components/gw2/favoritos-client'
import CoachPanel, { type CoachSection, type CoachPick } from '@/components/gw2/coach-panel'

export const dynamic = 'force-dynamic'

export default async function FavoritosPage() {
  const now = new Date()

  const [flipRaw, legs, refs] = await Promise.all([
    // Flipping: se ranquea por FLUJO diario (transacciones/día), no por margen —
    // mercados profundos donde tu orden se llena igual aunque te undercutteen,
    // en vez de peleas de +1 cobre en libros delgados.
    prisma.gw2MarketOpportunity.findMany({ where: { profitFlip: { gt: 0 }, flujoDiario: { gt: 0 } }, orderBy: { flujoDiario: 'desc' }, take: 20 }),
    prisma.gw2LegendaryOpportunity.findMany({ where: { viable: true }, orderBy: { oroPotencialDiario: 'desc' }, take: 2 }),
    prisma.gw2RefinementOpportunity.findMany({ where: { gananciaBuyOrder: { gt: 0 } }, orderBy: { oroPotencialDiario: 'desc' }, take: 3 }),
  ])

  // Recetas de refinamiento (para saber qué mats mandar a comprar).
  const refRecipes = refs.length
    ? await prisma.gw2RefinementRecipe.findMany({ where: { outputItemId: { in: refs.map((r) => r.outputItemId) } } })
    : []
  const recipeByOutput = new Map(refRecipes.map((r) => [r.outputItemId, (r.ingredients as { count: number; itemId: number }[]) ?? []]))

  // Evento no terminado más cercano + sus ítems clave (primer grupo del content).
  const nextEvent = GW2_EVENTS.map((e) => ({ e, st: getEventStatus(e, now) }))
    .filter((x) => x.st.status !== 'terminado')
    .sort((a, b) => a.st.daysUntilNext - b.st.daysUntilNext)[0]
  const festItems = nextEvent ? nextEvent.e.groups[0].items.slice(0, 4) : []

  // Nombres/iconos/rareza + precios de festival.
  const ingredientIds = [...recipeByOutput.values()].flat().map((i) => i.itemId)
  const allIds = Array.from(
    new Set([
      ...flipRaw.map((m) => m.itemId),
      ...legs.map((l) => l.itemId),
      ...refs.map((r) => r.outputItemId),
      ...ingredientIds,
      ...festItems.map((i) => i.id),
    ]),
  )
  const [items, festPrices] = await Promise.all([
    prisma.gw2Item.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true, icon: true, rarity: true } }),
    festItems.length ? getCurrentPrices(festItems.map((i) => i.id)) : Promise.resolve(new Map()),
  ])
  const itemById = new Map(items.map((i) => [i.id, i]))
  const nameOf = (id: number) => itemById.get(id)?.name ?? `#${id}`
  const iconOf = (id: number) => itemById.get(id)?.icon ?? null

  // Flipping: excluir legendarias (tienen su propia estrategia).
  const flips = flipRaw.filter((m) => itemById.get(m.itemId)?.rarity !== 'Legendary').slice(0, 3)

  const sections: CoachSection[] = []

  if (nextEvent) {
    const active = nextEvent.st.status === 'activo'
    const picks: CoachPick[] = festItems.map((ei) => {
      const p = festPrices.get(ei.id)
      const ask = p?.sellPrice ?? 0
      return {
        name: nameOf(ei.id),
        iconUrl: iconOf(ei.id),
        detail: ei.note ? ei.note.split('—').slice(1).join('—').trim() || ei.note : 'Material del festival',
        value: ask > 0 ? formatCopper(ask) : '—',
        valueLabel: 'precio ask',
        strong: false,
      }
    })
    sections.push({
      icon: 'event',
      title: active ? `${nextEvent.e.emoji} ${nextEvent.e.name} — activo` : `${nextEvent.e.emoji} ${nextEvent.e.name} — en ${nextEvent.st.daysUntilNext} días`,
      allocation: '~30%',
      thesis: nextEvent.e.strategy,
      href: '/gw2/eventos',
      picks,
    })
  }

  if (flips.length) {
    sections.push({
      icon: 'flip',
      title: 'Flipping (alto volumen)',
      allocation: '~25%',
      thesis: 'Mercados profundos con mucho flujo diario: tu orden se llena igual aunque te undercutteen, sin pelear +1 cobre en libros delgados. Margen chico por unidad, pero rota muchísimo.',
      href: '/gw2',
      picks: flips.map((m) => ({
        name: nameOf(m.itemId),
        iconUrl: iconOf(m.itemId),
        detail: `Buy order a ${formatCopper(m.bid)}, vendé a ${formatCopper(m.ask)} · ${Math.round(m.flujoDiario).toLocaleString('es-MX')}/día de flujo`,
        value: formatCopper(m.oroPotencialDiario),
        valueLabel: 'oro / día',
      })),
    })
  }

  if (legs.length) {
    sections.push({
      icon: 'legendary',
      title: 'Legendarias (market-making)',
      allocation: '~15%',
      thesis: 'Capital que rota lento sobre las que se mueven de verdad: buy order abajo, revendé arriba. Alto ticket, pocas ventas — no metas todo acá.',
      href: '/gw2/legendarias',
      picks: legs.map((l) => ({
        name: nameOf(l.itemId),
        iconUrl: iconOf(l.itemId),
        detail: `Buy order a ${formatCopper(l.bid)}, revendé a ${formatCopper(l.ask)} · ${l.soldSemana}/sem real`,
        value: formatCopper(l.oroPotencialDiario),
        valueLabel: 'oro / día',
      })),
    })
  }

  if (refs.length) {
    sections.push({
      icon: 'refine',
      title: 'Refinamiento (renta fija)',
      allocation: '~20%',
      thesis: 'Bajo riesgo y constante: mandá a comprar estos mats con buy order, refiná y vendé el refinado listado. El throughput lo acota la demanda real del refinado.',
      href: '/gw2/refinamiento',
      picks: refs.map((r) => {
        const ings = recipeByOutput.get(r.outputItemId) ?? []
        const buyList = ings.map((i) => `${i.count}× ${nameOf(i.itemId)}`).join(' + ')
        return {
          name: `→ ${nameOf(r.outputItemId)}`,
          iconUrl: iconOf(r.outputItemId),
          detail: buyList ? `Comprá: ${buyList} · +${formatCopper(r.gananciaBuyOrder)}/u` : `+${formatCopper(r.gananciaBuyOrder)}/u · ~${Math.round(r.refinedSoldDiario)}/día`,
          value: formatCopper(r.oroPotencialDiario),
          valueLabel: 'oro / día',
        }
      }),
    })
  }

  return (
    <>
      <div className='p-6 pb-2'>
        <CoachPanel sections={sections} />
      </div>
      <FavoritosClient />
    </>
  )
}
