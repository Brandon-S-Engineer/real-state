import { prisma } from '../src/lib/db'
import { buildPriceTable, getElecSettings, loadWindowRows } from '../src/lib/electronicos/stats'

async function main() {
  const all = await prisma.elecListing.findMany({
    select: { title: true, price: true, configKey: true, line: true, chip: true, ramGb: true, ssdGb: true, zoneKind: true, flags: true, status: true, needsReview: true },
    orderBy: { price: 'asc' },
  })
  console.log('=== ALL LISTINGS ===')
  for (const l of all) {
    console.log(String(l.price).padStart(7), l.zoneKind.padEnd(7), (l.configKey ?? '-').padEnd(24), l.status.padEnd(13), l.needsReview ? 'REV' : '   ', JSON.stringify(l.flags), l.title.slice(0, 50))
  }

  console.log('\n=== PRICE TABLE ===')
  const settings = await getElecSettings()
  const rows = buildPriceTable(await loadWindowRows(settings), settings)
  for (const r of rows) {
    console.log(r.configKey.padEnd(24), 'n=' + r.n, 'all:', r.all, 'buy:', r.buy, 'sell:', r.sell, 'spread:', r.spread, r.spreadApprox ? '(approx)' : '')
  }
}
main().finally(() => prisma.$disconnect())
