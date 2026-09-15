/**
 * Escáner de mercado: alimenta "Grandes Spreads" y "Demanda Subiendo".
 * Etapa 1 (~140 req a la API oficial) + Etapa 2 (ingesta DataWars2 del
 * shortlist, ~pocos min la primera vez). Uso: npm run scan:gw2-market
 */
import { PrismaClient } from "@prisma/client"
import { runMarketScan } from "../../src/lib/gw2/market-scan"

async function main() {
  const prisma = new PrismaClient()
  const start = Date.now()
  console.log("📊 Escaneando mercado completo (spreads + demanda)...")

  const { scanned, shortlisted, stored } = await runMarketScan()
  const secs = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`   Etapa 1: ${scanned} ítems con mercado de dos lados`)
  console.log(`   Etapa 2: ${shortlisted} en shortlist → ${stored} con transacciones reales guardados`)
  console.log(`✅ Listo en ${secs}s`)

  await prisma.$disconnect()
}
main().catch((e) => { console.error("❌ Scan falló:", e); process.exit(1) })
