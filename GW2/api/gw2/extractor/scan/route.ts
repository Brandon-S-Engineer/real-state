import { runExtractorScan } from '@/lib/gw2/extractor-score'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const results = await runExtractorScan()

  const itemIds = Array.from(new Set(results.flatMap((r) => [r.sourceItemId, r.upgradeItemId])))
  const items = await prisma.gw2Item.findMany({ where: { id: { in: itemIds } } })
  const itemById = new Map(items.map((i) => [i.id, i]))

  const enriched = results.map((r) => ({
    ...r,
    sourceItem: itemById.get(r.sourceItemId) ?? null,
    upgradeItem: itemById.get(r.upgradeItemId) ?? null,
  }))

  return NextResponse.json(enriched)
}
