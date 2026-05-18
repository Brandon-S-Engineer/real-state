import { PrismaClient } from "@prisma/client"
import { ZONES } from "./config.js"

const prisma = new PrismaClient()

async function main() {
  for (const z of ZONES) {
    const existing = await prisma.zone.findUnique({ where: { name: z.name } })
    if (existing) {
      console.log(`  ↺ Zona ya existe: ${z.name}`)
      continue
    }
    await prisma.zone.create({
      data: {
        name: z.name,
        searchUrl: z.searchUrl,
        locationKeywords: z.locationKeywords,
        desarrolloKeywords: z.desarrolloKeywords,
        active: true,
      },
    })
    console.log(`  ✓ Zona creada: ${z.name}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
