/**
 * Resuelve las recetas de refinamiento (base → refinado) desde la API oficial
 * (/v2/recipes, type "Refinement") y las guarda en Gw2RefinementRecipe. Estático
 * — se corre una vez (o cuando ArenaNet agregue tiers). Uso: npm run sync:gw2-refinement
 */
import { PrismaClient } from "@prisma/client"

const BASE = "https://api.guildwars2.com/v2"

// Outputs de refinamiento tier base/fine (metal, tela, cuero, madera + dowels).
// Se excluyen ascended/masterwork time-gated (Damask, Deldrimor, Spiritwood…):
// eso es producción, no flipping.
const OUTPUTS = [
  19679, 19680, 19681, 19682, 19683, 19684, 19685, 19686, 19687, 19688, // ingots
  19742, 19746, 19720, 19744, 19747, 19740, // bolts (cloth)
  19734, 19737, 19736, 19735, 19733, 19738, // leather squares
  19712, 19709, 19710, 19711, 19714, 19713, // planks (wood)
  19757, 19758, 19759, 19760, 19761, // dowels (wood, 2º tier)
]

async function j(url: string): Promise<any> {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url)
    if (r.ok) return r.json()
    await new Promise((x) => setTimeout(x, 400))
  }
  throw new Error("fail " + url)
}

function familyFor(name: string): string {
  if (/Ingot/.test(name)) return "Metal"
  if (/Bolt of/.test(name)) return "Cloth"
  if (/Leather Square/.test(name)) return "Leather"
  return "Wood" // Plank / Dowel
}

async function main() {
  const prisma = new PrismaClient()
  console.log("🔧 Sincronizando recetas de refinamiento...")

  let stored = 0
  for (const out of OUTPUTS) {
    const found: number[] = await j(`${BASE}/recipes/search?output=${out}`)
    for (const rid of found) {
      const r = await j(`${BASE}/recipes/${rid}`)
      if (r.type !== "Refinement") continue
      const outItem = await prisma.gw2Item.findUnique({ where: { id: r.output_item_id } })
      await prisma.gw2RefinementRecipe.upsert({
        where: { outputItemId: r.output_item_id },
        create: {
          recipeId: r.id,
          outputItemId: r.output_item_id,
          outputCount: r.output_item_count ?? 1,
          family: familyFor(outItem?.name ?? ""),
          ingredients: r.ingredients.map((g: any) => ({ itemId: g.item_id, count: g.count })),
        },
        update: {
          recipeId: r.id,
          outputCount: r.output_item_count ?? 1,
          family: familyFor(outItem?.name ?? ""),
          ingredients: r.ingredients.map((g: any) => ({ itemId: g.item_id, count: g.count })),
        },
      })
      stored++
      break
    }
    await new Promise((x) => setTimeout(x, 120))
  }

  console.log(`✅ ${stored} recetas de refinamiento guardadas`)
  await prisma.$disconnect()
}
main().catch((e) => { console.error("❌", e); process.exit(1) })
