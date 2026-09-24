// ── Catálogo MacBook (Apple silicon M1–M5 + MacBook Neo) ─────────────────────
//
// Fuente: support.apple.com "Identify your MacBook Air/Pro model" + tech specs
// (consultado 2026-09). Sirve para dos cosas:
//   1. Validar lo que el parser extrae ("Pro 13 M3" no existe → baja confianza)
//   2. Inferir lo que falta ("M1 Pro" ⇒ Pro 14/16; Air M1 ⇒ 13")
//
// Intel queda fuera a propósito: no lo compramos ni lo usamos para precios.

export type Line = 'AIR_13' | 'AIR_15' | 'PRO_13' | 'PRO_14' | 'PRO_16' | 'NEO_13'

export const LINES: Line[] = ['AIR_13', 'AIR_15', 'PRO_13', 'PRO_14', 'PRO_16', 'NEO_13']

export const LINE_LABEL: Record<Line, string> = {
  AIR_13: 'Air 13',
  AIR_15: 'Air 15',
  PRO_13: 'Pro 13',
  PRO_14: 'Pro 14',
  PRO_16: 'Pro 16',
  NEO_13: 'Neo 13',
}

export type CatalogEntry = {
  line: Line
  chips: string[]
  year: number
  ram: number[]
  ssd: number[] // GB
}

const SSD_STD = [256, 512, 1024, 2048]
const SSD_PRO = [512, 1024, 2048, 4096, 8192]

export const CATALOG: CatalogEntry[] = [
  // Air
  { line: 'AIR_13', chips: ['M1'], year: 2020, ram: [8, 16], ssd: SSD_STD },
  { line: 'AIR_13', chips: ['M2'], year: 2022, ram: [8, 16, 24], ssd: SSD_STD },
  { line: 'AIR_15', chips: ['M2'], year: 2023, ram: [8, 16, 24], ssd: SSD_STD },
  { line: 'AIR_13', chips: ['M3'], year: 2024, ram: [8, 16, 24], ssd: SSD_STD },
  { line: 'AIR_15', chips: ['M3'], year: 2024, ram: [8, 16, 24], ssd: SSD_STD },
  { line: 'AIR_13', chips: ['M4'], year: 2025, ram: [16, 24, 32], ssd: SSD_STD },
  { line: 'AIR_15', chips: ['M4'], year: 2025, ram: [16, 24, 32], ssd: SSD_STD },
  { line: 'AIR_13', chips: ['M5'], year: 2026, ram: [16, 24, 32], ssd: [512, 1024, 2048, 4096] },
  { line: 'AIR_15', chips: ['M5'], year: 2026, ram: [16, 24, 32], ssd: [512, 1024, 2048, 4096] },
  // Pro 13
  { line: 'PRO_13', chips: ['M1'], year: 2020, ram: [8, 16], ssd: SSD_STD },
  { line: 'PRO_13', chips: ['M2'], year: 2022, ram: [8, 16, 24], ssd: SSD_STD },
  // Pro 14 / 16
  { line: 'PRO_14', chips: ['M1 Pro', 'M1 Max'], year: 2021, ram: [16, 32, 64], ssd: SSD_PRO },
  { line: 'PRO_16', chips: ['M1 Pro', 'M1 Max'], year: 2021, ram: [16, 32, 64], ssd: SSD_PRO },
  { line: 'PRO_14', chips: ['M2 Pro', 'M2 Max'], year: 2023, ram: [16, 32, 64, 96], ssd: SSD_PRO },
  { line: 'PRO_16', chips: ['M2 Pro', 'M2 Max'], year: 2023, ram: [16, 32, 64, 96], ssd: SSD_PRO },
  { line: 'PRO_14', chips: ['M3'], year: 2023, ram: [8, 16, 24], ssd: [512, 1024, 2048] },
  { line: 'PRO_14', chips: ['M3 Pro', 'M3 Max'], year: 2023, ram: [18, 36, 48, 64, 96, 128], ssd: SSD_PRO },
  { line: 'PRO_16', chips: ['M3 Pro', 'M3 Max'], year: 2023, ram: [18, 36, 48, 64, 96, 128], ssd: SSD_PRO },
  { line: 'PRO_14', chips: ['M4'], year: 2024, ram: [16, 24, 32], ssd: [512, 1024, 2048] },
  { line: 'PRO_14', chips: ['M4 Pro', 'M4 Max'], year: 2024, ram: [24, 36, 48, 64, 128], ssd: SSD_PRO },
  { line: 'PRO_16', chips: ['M4 Pro', 'M4 Max'], year: 2024, ram: [24, 36, 48, 64, 128], ssd: SSD_PRO },
  { line: 'PRO_14', chips: ['M5'], year: 2025, ram: [16, 24, 32], ssd: [512, 1024, 2048, 4096] },
  { line: 'PRO_14', chips: ['M5 Pro', 'M5 Max'], year: 2026, ram: [24, 36, 48, 64, 128], ssd: [1024, 2048, 4096, 8192] },
  { line: 'PRO_16', chips: ['M5 Pro', 'M5 Max'], year: 2026, ram: [24, 36, 48, 64, 128], ssd: [1024, 2048, 4096, 8192] },
  // Neo (A18 Pro, marzo 2026)
  { line: 'NEO_13', chips: ['A18 Pro'], year: 2026, ram: [8], ssd: [256, 512] },
]

export const CHIPS = Array.from(new Set(CATALOG.flatMap((e) => e.chips)))

/** Números de modelo (A####) que aparecen seguido en títulos. */
export const MODEL_NUMBERS: Record<string, { line: Line; chip?: string } | 'INTEL'> = {
  A2337: { line: 'AIR_13', chip: 'M1' },
  A2338: { line: 'PRO_13' }, // M1 o M2 — mismo chasis
  A2681: { line: 'AIR_13', chip: 'M2' },
  A2941: { line: 'AIR_15', chip: 'M2' },
  A3113: { line: 'AIR_13', chip: 'M3' },
  A3114: { line: 'AIR_15', chip: 'M3' },
  A3240: { line: 'AIR_13', chip: 'M4' },
  A3241: { line: 'AIR_15', chip: 'M4' },
  A2442: { line: 'PRO_14' }, // M1 Pro/Max
  A2485: { line: 'PRO_16' }, // M1 Pro/Max
  A2779: { line: 'PRO_14' }, // M2 Pro/Max
  A2780: { line: 'PRO_16' }, // M2 Pro/Max
  A2918: { line: 'PRO_14', chip: 'M3' },
  A2992: { line: 'PRO_14' }, // M3 Pro/Max
  A2991: { line: 'PRO_16' }, // M3 Pro/Max
  // Intel frecuentes en Marketplace
  A1278: 'INTEL', A1466: 'INTEL', A1502: 'INTEL', A1398: 'INTEL', A1706: 'INTEL',
  A1708: 'INTEL', A1989: 'INTEL', A1990: 'INTEL', A1932: 'INTEL', A2159: 'INTEL',
  A2179: 'INTEL', A2141: 'INTEL', A2251: 'INTEL', A2289: 'INTEL',
}

export function findEntries(line: Line | null, chip: string | null): CatalogEntry[] {
  return CATALOG.filter((e) => (!line || e.line === line) && (!chip || e.chips.includes(chip)))
}

/** Líneas en las que existe un chip dado. */
export function linesForChip(chip: string): Line[] {
  return Array.from(new Set(CATALOG.filter((e) => e.chips.includes(chip)).map((e) => e.line)))
}

export function formatSsd(gb: number | null | undefined): string {
  if (!gb) return '?'
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`
}

export function configLabel(c: { line: string | null; chip: string | null; ramGb: number | null; ssdGb: number | null }): string {
  const line = c.line ? LINE_LABEL[c.line as Line] ?? c.line : '?'
  return `${line} · ${c.chip ?? '?'} · ${c.ramGb ? `${c.ramGb}GB` : '?'} · ${formatSsd(c.ssdGb)}`
}
