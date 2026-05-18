/**
 * Scraper de Inmuebles24 para análisis de mercado inmobiliario CDMX.
 *
 * Uso:
 *   npm run scrape                       ← todas las zonas activas
 *   npm run scrape -- --zona Interlomas  ← zona específica
 *   npm run scrape -- --dry-run          ← sin escribir a DB
 *   npm run scrape -- --run-id <id>      ← actualizar ScrapeRun existente
 */
import { PrismaClient } from "@prisma/client"
import { SUSPEND_AFTER_HOURS, type ZoneConfig } from "./config.js"
import { scrapeZone } from "./inmuebles24.js"
import { upsertListing, suspendMissingListings } from "./upsert-listing.js"
import { recalcularDealScores } from "./deal-score.js"

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const zonaFilter = args.includes("--zona")
  ? args[args.indexOf("--zona") + 1]
  : null
const runId = args.includes("--run-id")
  ? args[args.indexOf("--run-id") + 1]
  : null

async function main() {
  const prisma = new PrismaClient()
  const sessionStart = new Date()

  console.log("🏠 Scraper Inmobiliario CDMX")
  console.log(`   Inicio: ${sessionStart.toISOString()}`)
  if (dryRun) console.log("   ⚠ DRY RUN — sin escritura a DB")
  if (zonaFilter) console.log(`   Zona filtrada: ${zonaFilter}`)
  if (runId) console.log(`   Run ID: ${runId}`)

  // Leer zonas activas de la DB
  const dbZones = await prisma.zone.findMany({
    where: {
      active: true,
      ...(zonaFilter ? { name: { equals: zonaFilter, mode: "insensitive" } } : {}),
    },
  })

  if (dbZones.length === 0) {
    const msg = zonaFilter
      ? `No se encontró la zona activa: ${zonaFilter}`
      : "No hay zonas activas en la DB. Crea una en /dashboard/zonas."
    console.error(`❌ ${msg}`)
    if (runId) {
      await prisma.scrapeRun.update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: new Date(), error: msg },
      })
    }
    process.exit(1)
  }

  const zonas: ZoneConfig[] = dbZones.map((z) => ({
    name: z.name,
    searchUrl: z.searchUrl,
    locationKeywords: z.locationKeywords as string[],
    desarrolloKeywords: z.desarrolloKeywords as string[],
  }))

  let totalNew = 0
  let totalUpdated = 0
  let totalUnchanged = 0
  let totalSuspended = 0

  for (const zone of zonas) {
    let zoneNew = 0
    let zoneUpdated = 0
    let zoneUnchanged = 0
    let zoneSuspended = 0

    try {
      const listings = await scrapeZone(zone)

      if (!dryRun) {
        for (const raw of listings) {
          const result = await upsertListing(prisma, raw)
          if (result === "new") zoneNew++
          else if (result === "updated") zoneUpdated++
          else zoneUnchanged++
        }

        zoneSuspended = await suspendMissingListings(
          prisma,
          zone.name,
          sessionStart,
          SUSPEND_AFTER_HOURS
        )
        totalSuspended += zoneSuspended
        if (zoneSuspended > 0) {
          console.log(`  🔴 ${zoneSuspended} listings marcados como SUSPENDED en ${zone.name}`)
        }
      } else {
        listings.forEach((l, i) => {
          console.log(
            `  [${i + 1}] ${l.title.slice(0, 60)} | $${l.price?.toLocaleString("es-MX")} | ${l.m2Constructed}m² | ${l.bedrooms}rec | ${l.sourceId}`
          )
        })
      }

      totalNew += zoneNew
      totalUpdated += zoneUpdated
      totalUnchanged += zoneUnchanged

      console.log(
        `  Zona ${zone.name}: +${zoneNew} nuevos, ~${zoneUpdated} actualizados, ${zoneUnchanged} sin cambios`
      )

      // Actualizar progreso del ScrapeRun en vivo
      if (runId && !dryRun) {
        await prisma.scrapeRun.update({
          where: { id: runId },
          data: {
            listingsNew: totalNew,
            listingsUpdated: totalUpdated,
            listingsUnchanged: totalUnchanged,
            listingsSuspended: totalSuspended,
          },
        })
      }
    } catch (err) {
      const msg = (err as Error).message
      console.error(`❌ Error scrapeando ${zone.name}:`, msg)
      if (runId && !dryRun) {
        await prisma.scrapeRun.update({
          where: { id: runId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            error: `${zone.name}: ${msg}`,
          },
        })
        await prisma.$disconnect()
        process.exit(1)
      }
    }
  }

  if (!dryRun) {
    console.log("\n📊 Recalculando deal scores...")
    await recalcularDealScores(prisma)
  }

  const duration = ((Date.now() - sessionStart.getTime()) / 1000).toFixed(1)
  console.log("\n─────────────────────────────────────────")
  console.log(`✅ Scrape completado en ${duration}s`)
  console.log(
    `   Nuevos: ${totalNew} | Actualizados: ${totalUpdated} | Sin cambios: ${totalUnchanged} | Suspendidos: ${totalSuspended}`
  )

  if (runId && !dryRun) {
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        listingsNew: totalNew,
        listingsUpdated: totalUpdated,
        listingsUnchanged: totalUnchanged,
        listingsSuspended: totalSuspended,
      },
    })
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error("Error fatal:", err)
  if (runId) {
    const prisma = new PrismaClient()
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), error: (err as Error).message },
    }).catch(() => {})
    await prisma.$disconnect()
  }
  process.exit(1)
})
