// ── Unidentified Gear: ¿conviene procesar el amarillo (rare)? ─────────────────
//
// El play: comprar Piece of Rare Unidentified Gear por orden de compra, abrirlo
// (250 → ~247 rare + ~3 exotic) y salvagear TODO con el Silver-Fed. La tabla
// replica un calculador de salvage clásico PERO con una corrección clave:
//
//   los ectos NO se venden directo — se procesan a Crystalline Dust, que deja
//   más oro. 250 × 0.891 = 222.75 ectos; ×1.85 = ~412 Crystalline Dust.
//
// El costo extra de salvagear los ectos con el Silver-Fed se cancela con la
// suerte (Lucent Motes) que suelta, así que se ignora. Los rendimientos de
// materiales por stack son promedios empíricos (del calculador de referencia);
// los precios se sacan en vivo del snapshot. IDs verificados contra el cache.

export type UnidMaterial = { id: number; qtyPerStack: number }

export const UNID = {
  stackSize: 250,
  // Al abrir 250 rares salen ~247 rare + ~3 exotic; ambos dan ecto al salvagear
  // con un factor combinado de 0.891 por ítem → 222.75 ectos por stack.
  ectoYieldFactor: 0.891,
  // Cada ecto procesado rinde ~1.85 Crystalline Dust.
  ectoToDust: 1.85,
  // Costo del Silver-Fed por salvage (constante de juego, visible y ajustable).
  silverFedCostPerSalvageCopper: 60,
  // Extraer sellos/runas con el extractor infinito antes de salvagear deja
  // ~3.35g extra por stack de 250 (empírico). Se prorratea por múltiplos de 50.
  sigilBonusPerStackCopper: 33_500,
  // TP cut del 15% en la venta.
  tpCut: 0.15,

  rareGearItemId: 83008, // Piece of Rare Unidentified Gear (el amarillo)
  ectoItemId: 19721, // Glob of Ectoplasm
  dustItemId: 24277, // Pile of Crystalline Dust

  // Rendimiento promedio de materiales al salvagear un stack de 250 rares
  // (sin ecto/dust, que se computan aparte). Orden ~ como el calculador.
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
  ] as UnidMaterial[],
} as const

/** Todos los IDs que la página necesita cotizar en vivo. */
export function unidItemIds(): number[] {
  return Array.from(new Set([UNID.rareGearItemId, UNID.ectoItemId, UNID.dustItemId, ...UNID.materials.map((m) => m.id)]))
}

export const SIGIL_BONUS_STEPS = [50, 100, 150, 200, 250] as const
