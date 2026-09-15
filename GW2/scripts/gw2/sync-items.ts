/**
 * Sync de ítems tradeable de GW2 hacia Gw2Item — cache que alimenta el resto
 * del sistema de trading (Extractor, Colector, Refinamiento).
 *
 * Uso:
 *   npm run sync:gw2-items
 *   npm run sync:gw2-items -- --dry-run
 *   npm run sync:gw2-items -- --limit 500   ← para probar rápido
 */
import { PrismaClient, ScrapeRunStatus } from "@prisma/client"
import { getTradeableItemIds, getItemsByIds, type Gw2ApiItem } from "../../src/lib/gw2/client"

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const limitArg = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : null

const INSERT_CHUNK = 1000

function toGw2ItemRow(item: Gw2ApiItem) {
  const details = item.details as { type?: string } | undefined
  return {
    id: item.id,
    name: item.name,
    icon: item.icon ?? null,
    rarity: item.rarity,
    level: item.level ?? 0,
    type: item.type,
    subtype: details?.type ?? null,
    vendorValue: item.vendor_value ?? 0,
    flags: item.flags ?? [],
    restrictions: item.restrictions ?? [],
    details: item.details ?? undefined,
    lastRefreshedAt: new Date(),
  }
}

async function main() {
  const prisma = new PrismaClient()
  const startedAt = new Date()

  console.log("🎮 Sync de ítems GW2")
  console.log(`   Inicio: ${startedAt.toISOString()}`)
  if (dryRun) console.log("   ⚠ DRY RUN — sin escritura a DB")
  if (limitArg) console.log(`   Límite: ${limitArg} ítems`)

  const run = dryRun
    ? null
    : await prisma.gw2ItemSyncRun.create({ data: { status: ScrapeRunStatus.RUNNING } })

  try {
    console.log("   Consultando universo tradeable (/v2/commerce/prices)...")
    let ids = await getTradeableItemIds()
    console.log(`   ${ids.length} ítems tradeable en el Trading Post`)

    if (limitArg) ids = ids.slice(0, limitArg)

    console.log("   Descargando metadata (/v2/items, lotes de 200)...")
    const items = await getItemsByIds(ids)
    console.log(`   ${items.length} ítems descargados`)

    let inserted = 0
    if (!dryRun) {
      // Metadata de ítems es prácticamente estática (nombre/rareza/tipo no
      // cambian tras el lanzamiento) — createMany + skipDuplicates evita
      // ~20-30k roundtrips de upsert individual contra Neon. Ítems ya
      // cacheados no se re-escriben; si algún día hace falta forzar refresh
      // de metadata existente, ese es un modo aparte, no el sync semanal.
      for (let i = 0; i < items.length; i += INSERT_CHUNK) {
        const batch = items.slice(i, i + INSERT_CHUNK).map(toGw2ItemRow)
        const result = await prisma.gw2Item.createMany({ data: batch, skipDuplicates: true })
        inserted += result.count
        console.log(`   ...${Math.min(i + INSERT_CHUNK, items.length)}/${items.length} procesados (${inserted} nuevos)`)
      }
    }

    console.log(`✅ Listo. ${dryRun ? `${items.length} ítems (dry run, sin escribir)` : `${inserted} ítems nuevos guardados`}`)

    if (run) {
      await prisma.gw2ItemSyncRun.update({
        where: { id: run.id },
        data: { status: ScrapeRunStatus.COMPLETED, finishedAt: new Date(), itemsUpserted: inserted },
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("❌ Sync falló:", msg)
    if (run) {
      await prisma.gw2ItemSyncRun.update({
        where: { id: run.id },
        data: { status: ScrapeRunStatus.FAILED, finishedAt: new Date(), error: msg },
      })
    }
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
