import { requireAdmin } from '@/lib/require-admin'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { CATEGORY_META, configShort, type Category } from '@/lib/electronicos/categories'
import { getElecSettings } from '@/lib/electronicos/stats'

// Oportunidades recientes (score ≥ minScoreAlert) de las 3 categorías, para la
// campanita del topbar — mismo umbral que "Alertarme si score ≥" en Listings.
export async function GET() {
  const error = await requireAdmin()
  if (error) return error

  const settings = await getElecSettings()
  const rows = await prisma.elecListing.findMany({
    where: { status: 'ACTIVO', opportunityScore: { gte: settings.minScoreAlert } },
    orderBy: { lastSeenAt: 'desc' },
    take: 20,
    select: {
      id: true, category: true, title: true, price: true, url: true, opportunityScore: true,
      line: true, chip: true, ramGb: true, ssdGb: true, lastSeenAt: true,
    },
  })

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      category: r.category as Category,
      label: CATEGORY_META[r.category as Category]?.label ?? r.category,
      title: r.title,
      config: configShort(r),
      price: r.price,
      url: r.url,
      score: r.opportunityScore,
      lastSeenAt: r.lastSeenAt.toISOString(),
    })),
  })
}
