// ── Unidentified Gear: ¿conviene procesar? (amarillo + verde) ─────────────────
//
// El play: comprar Unidentified Gear por orden de compra, abrirlo y salvagear
// todo. La tabla replica un calculador de salvage clásico PERO con una
// corrección clave: los ectos NO se venden directo — se procesan a Crystalline
// Dust (×1.85 por ecto), que deja más oro. Dos variantes:
//   - Amarillo (Rare): ~222.75 ectos por stack, salvage con Silver-Fed.
//   - Verde (Common): casi no da ectos (~7.6), salvage con Runecrafter's + Silver-Fed.
//
// El costo extra de salvagear los ectos se cancela con la suerte (Lucent Motes),
// así que se ignora. Rendimientos = promedios empíricos del calculador; precios
// en vivo. IDs verificados contra el cache.

export type UnidMaterial = { id: number; qtyPerStack: number }
export type SalvageCostLine = { label: string; uses: number; costPerUseCopper: number }

export type UnidVariant = {
  key: 'rare' | 'green'
  label: string
  gearItemId: number
  /** Ecto yield por stack (rare ya incluye los 3 exóticos). */
  ectos: number
  ectoNote: string
  /** Valor de la suerte (Essence of Luck) que suelta por stack, en cobre. Los verdes sueltan mucha; los rare no. */
  luckValueCopper: number
  materials: UnidMaterial[]
  salvageCosts: SalvageCostLine[]
}

const RARE: UnidVariant = {
  key: 'rare',
  label: 'Amarillo (Rare)',
  gearItemId: 83008, // Piece of Rare Unidentified Gear
  ectos: 222.75, // 250 × 0.891 (247 rare + 3 exotic)
  ectoNote: '250 × 0.891 = 222.75 ectos (247 rare + 3 exotic)',
  luckValueCopper: 0, // los rare no sueltan suerte relevante
  materials: [
    { id: 19700, qtyPerStack: 115.125 }, // Mithril Ore
    { id: 19722, qtyPerStack: 96.15 }, // Elder Wood Log
    { id: 19748, qtyPerStack: 80.9 }, // Silk Scrap
    { id: 19729, qtyPerStack: 65 }, // Thick Leather Section
    { id: 19701, qtyPerStack: 9.975 }, // Orichalcum Ore
    { id: 19725, qtyPerStack: 7.4 }, // Ancient Wood Log
    { id: 19745, qtyPerStack: 4.125 }, // Gossamer Scrap
    { id: 19732, qtyPerStack: 3.875 }, // Hardened Leather Section
    { id: 89140, qtyPerStack: 348.3 }, // Lucent Mote
    { id: 89098, qtyPerStack: 0.95 }, // Symbol of Control
    { id: 89141, qtyPerStack: 1.75 }, // Symbol of Enhancement
    { id: 89182, qtyPerStack: 0.775 }, // Symbol of Pain
    { id: 89103, qtyPerStack: 1.425 }, // Charm of Brilliance
    { id: 89258, qtyPerStack: 0.75 }, // Charm of Potence
    { id: 89216, qtyPerStack: 0.85 }, // Charm of Skill
  ],
  salvageCosts: [{ label: 'Silver-Fed', uses: 250, costPerUseCopper: 60 }],
}

const GREEN: UnidVariant = {
  key: 'green',
  label: 'Verde (Common)',
  gearItemId: 84731, // Piece of Unidentified Gear
  ectos: 7.6, // los verdes casi no dan ectos
  ectoNote: 'los verdes casi no dan ectos (~7.6 por stack)',
  luckValueCopper: 3200, // la suerte que sueltan vale ~32s por stack (duplica la ganancia base)
  materials: [
    { id: 19700, qtyPerStack: 112.65 }, // Mithril Ore
    { id: 19722, qtyPerStack: 91.175 }, // Elder Wood Log
    { id: 19748, qtyPerStack: 86.125 }, // Silk Scrap
    { id: 19729, qtyPerStack: 68 }, // Thick Leather Section
    { id: 19701, qtyPerStack: 9.75 }, // Orichalcum Ore
    { id: 19725, qtyPerStack: 7.25 }, // Ancient Wood Log
    { id: 19745, qtyPerStack: 4.45 }, // Gossamer Scrap
    { id: 19732, qtyPerStack: 4.2 }, // Hardened Leather Section
    { id: 89140, qtyPerStack: 245.2 }, // Lucent Mote
    { id: 89098, qtyPerStack: 0.45 }, // Symbol of Control
    { id: 89141, qtyPerStack: 1.25 }, // Symbol of Enhancement
    { id: 89182, qtyPerStack: 0.9 }, // Symbol of Pain
    { id: 89103, qtyPerStack: 1.075 }, // Charm of Brilliance
    { id: 89258, qtyPerStack: 0.7 }, // Charm of Potence
    { id: 89216, qtyPerStack: 0.7 }, // Charm of Skill
  ],
  salvageCosts: [
    { label: "Runecrafter's", uses: 240.925, costPerUseCopper: 30 },
    { label: 'Silver-Fed', uses: 8.4, costPerUseCopper: 60 },
  ],
}

export const UNID = {
  stackSize: 250,
  ectoToDust: 1.85, // cada ecto procesado rinde ~1.85 Crystalline Dust
  tpCut: 0.15,
  // Abrir + salvagear un stack tarda lo mismo sea amarillo o verde — el techo
  // real no es "cuántos stacks te ponés de meta", es cuánto tiempo tenés. Por
  // eso todo se muestra por hora (3600/45 = 80 stacks/h) en vez de una meta diaria.
  secondsPerStack: 45,
  ectoItemId: 19721, // Glob of Ectoplasm
  dustItemId: 24277, // Pile of Crystalline Dust
  // El ecto se vende mucho más rápido que el dust y no necesita el paso extra
  // de procesarlo — así que dust solo gana si supera al ecto por este margen,
  // no con un empate técnico de 1 cobre.
  dustPreferenceMargin: 0.2,
  // Craftear un material (Mithril Ore → Ingot, etc.) también es lento de
  // vender y de hacer — tardadísimo para lo poco que a veces deja. Mismo
  // criterio: solo se recomienda craftear si gana por este margen o más.
  craftPreferenceMargin: 0.2,
  // Señal de "buen momento para competir por amarillos" (se pinta dorado):
  // exige ganancia real de una sola vez (no una meta diaria acumulada) MÁS
  // que el gear se esté llenando notablemente más rápido que su propio
  // promedio — eso es lo que hace que la pelea de +1c dure segundos en vez
  // de minutos. Sin las dos cosas juntas, no vale la pena competir.
  goldEntry: {
    profitFloorCopper: 20000, // 2g por stack de una sola pasada
    velocityMin: 1.3, // el "bought" de hoy debe ser al menos 30% arriba de su promedio de 14 días
  },
  variants: [RARE, GREEN] as UnidVariant[],
} as const

// ── Craftear vs vender directo ───────────────────────────────────────────────

export const LUCENT_CRYSTAL_ID = 89271
export const PHIL_STONES_PER_SHARD = 10 // 10 Philosopher's Stone = 1 Spirit Shard (sin oro)

export type RefineOption = { outputId: number; inputPer: number }

/** input itemId → cómo refinarlo (n input → 1 output). */
export const MATERIAL_REFINE: Record<number, RefineOption> = {
  19700: { outputId: 19684, inputPer: 2 }, // Mithril Ore → Mithril Ingot
  19701: { outputId: 19685, inputPer: 2 }, // Orichalcum Ore → Orichalcum Ingot
  19745: { outputId: 19746, inputPer: 2 }, // Gossamer Scrap → Bolt of Gossamer
  19748: { outputId: 19747, inputPer: 3 }, // Silk Scrap → Bolt of Silk
  19732: { outputId: 19737, inputPer: 3 }, // Hardened Leather → Cured Hardened Leather Square
  19729: { outputId: 19735, inputPer: 4 }, // Thick Leather → Cured Thick Leather Square
  19725: { outputId: 19712, inputPer: 3 }, // Ancient Wood Log → Ancient Wood Plank
  19722: { outputId: 19709, inputPer: 3 }, // Elder Wood Log → Elder Wood Plank
  89140: { outputId: LUCENT_CRYSTAL_ID, inputPer: 10 }, // Lucent Mote → Pile of Lucent Crystal
}

// ── Promoción de Crystalline Dust a materiales T6 (Mystic Forge) ──────────────

export const T6_PROMO = {
  avgYield: 7,
  dustPer: 5,
  t5Per: 50,
  philStonePer: 5,
  seedPer: 1,
}

export type T6Promotion = { t6Id: number; t5Id: number }

export const T6_PROMOTIONS: T6Promotion[] = [
  { t6Id: 24295, t5Id: 24294 }, // Vial of Powerful Blood ← Vial of Potent Blood
  { t6Id: 24283, t5Id: 24282 }, // Powerful Venom Sac ← Potent Venom Sac
  { t6Id: 24300, t5Id: 24299 }, // Elaborate Totem ← Intricate Totem
  { t6Id: 24289, t5Id: 24288 }, // Armored Scale ← Large Scale
  { t6Id: 24358, t5Id: 24341 }, // Ancient Bone ← Large Bone
  { t6Id: 24357, t5Id: 24356 }, // Vicious Fang ← Large Fang
  { t6Id: 24351, t5Id: 24350 }, // Vicious Claw ← Large Claw
]

/** Todos los IDs que la página necesita cotizar en vivo. */
export function unidItemIds(): number[] {
  const refineOutputs = Object.values(MATERIAL_REFINE).map((r) => r.outputId)
  const promo = T6_PROMOTIONS.flatMap((p) => [p.t6Id, p.t5Id])
  const variantIds = UNID.variants.flatMap((v) => [v.gearItemId, ...v.materials.map((m) => m.id)])
  return Array.from(new Set([UNID.ectoItemId, UNID.dustItemId, ...variantIds, ...refineOutputs, ...promo]))
}
