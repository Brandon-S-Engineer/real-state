import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ElecClient from '@/components/dashboard/elec/elec-client'
import type { Category } from '@/lib/electronicos/categories'
import { toListingDTO, toTradeDTO, toZoneDTO } from '@/lib/electronicos/serialize'
import { buildPriceTable, getElecSettings, loadWindowRows } from '@/lib/electronicos/stats'
import { ensureDefaultZones } from '@/lib/electronicos/zones'

/** Server component compartido por /dashboard/macbook y /dashboard/iphone. */
export async function ElecCategoryPage({ category }: { category: Category }) {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getElecSettings()
  const [listings, trades, zones, windowRows] = await Promise.all([
    prisma.elecListing.findMany({ where: { category }, include: { zone: true }, orderBy: { lastSeenAt: 'desc' }, take: 2000 }),
    prisma.elecTrade.findMany({ where: { category }, include: { listing: { select: { title: true, url: true } } }, orderBy: { buyDate: 'desc' } }),
    ensureDefaultZones(),
    loadWindowRows(settings, category),
  ])

  return (
    <Suspense>
      <ElecClient
        category={category}
        listings={listings.map(toListingDTO)}
        prices={buildPriceTable(windowRows, settings)}
        trades={trades.map(toTradeDTO)}
        zones={zones.map(toZoneDTO)}
        settings={settings}
      />
    </Suspense>
  )
}
