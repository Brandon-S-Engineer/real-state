// ── Catálogo iPad ────────────────────────────────────────────────────────────
//
// Fuente: support.apple.com "iPad models compatible with iPadOS 27" + Wikipedia
// por modelo (consultado 2026-09). Corte = soporte de iPadOS 27: quedan fuera
// los de chip A12 (Pro 11" 1ª gen, Pro 12.9" 3ª gen, Air 3, iPad 8, mini 5) y
// todo lo anterior → se descartan como "viejo".
//
// A diferencia de iPhone, en iPad el nombre no basta ("iPad Air" son 8 equipos
// distintos): el modelo se resuelve con familia + chip + tamaño + generación.

export type IpadFamily = 'PRO' | 'AIR' | 'BASE' | 'MINI'

export type IpadLine =
  | 'IPD_PRO_11_2' | 'IPD_PRO_129_4' | 'IPD_PRO_11_M1' | 'IPD_PRO_129_M1' | 'IPD_PRO_11_M2' | 'IPD_PRO_129_M2'
  | 'IPD_PRO_11_M4' | 'IPD_PRO_13_M4' | 'IPD_PRO_11_M5' | 'IPD_PRO_13_M5'
  | 'IPD_AIR_4' | 'IPD_AIR_5' | 'IPD_AIR_11_M2' | 'IPD_AIR_13_M2' | 'IPD_AIR_11_M3' | 'IPD_AIR_13_M3' | 'IPD_AIR_11_M4' | 'IPD_AIR_13_M4'
  | 'IPD_9' | 'IPD_10' | 'IPD_A16'
  | 'IPD_MINI_6' | 'IPD_MINI_7'

export type IpadEntry = {
  line: IpadLine
  family: IpadFamily
  label: string
  chip: string
  size: number // pulgadas
  gen: number // generación como la anuncia Apple dentro de su familia/tamaño
  year: number
  storage: number[]
}

const S_64 = [64, 256]
const S_PRO20 = [128, 256, 512, 1024]
const S_PRO_2TB = [128, 256, 512, 1024, 2048]
const S_PRO_M4 = [256, 512, 1024, 2048]
const S_AIR = [128, 256, 512, 1024]
const S_128 = [128, 256, 512]

export const IPAD_CATALOG: IpadEntry[] = [
  { line: 'IPD_PRO_11_2', family: 'PRO', label: 'Pro 11" (2ª gen, 2020)', chip: 'A12Z', size: 11, gen: 2, year: 2020, storage: S_PRO20 },
  { line: 'IPD_PRO_129_4', family: 'PRO', label: 'Pro 12.9" (4ª gen, 2020)', chip: 'A12Z', size: 12.9, gen: 4, year: 2020, storage: S_PRO20 },
  { line: 'IPD_PRO_11_M1', family: 'PRO', label: 'Pro 11" M1', chip: 'M1', size: 11, gen: 3, year: 2021, storage: S_PRO_2TB },
  { line: 'IPD_PRO_129_M1', family: 'PRO', label: 'Pro 12.9" M1', chip: 'M1', size: 12.9, gen: 5, year: 2021, storage: S_PRO_2TB },
  { line: 'IPD_PRO_11_M2', family: 'PRO', label: 'Pro 11" M2', chip: 'M2', size: 11, gen: 4, year: 2022, storage: S_PRO_2TB },
  { line: 'IPD_PRO_129_M2', family: 'PRO', label: 'Pro 12.9" M2', chip: 'M2', size: 12.9, gen: 6, year: 2022, storage: S_PRO_2TB },
  { line: 'IPD_PRO_11_M4', family: 'PRO', label: 'Pro 11" M4', chip: 'M4', size: 11, gen: 5, year: 2024, storage: S_PRO_M4 },
  { line: 'IPD_PRO_13_M4', family: 'PRO', label: 'Pro 13" M4', chip: 'M4', size: 13, gen: 7, year: 2024, storage: S_PRO_M4 },
  { line: 'IPD_PRO_11_M5', family: 'PRO', label: 'Pro 11" M5', chip: 'M5', size: 11, gen: 6, year: 2025, storage: S_PRO_M4 },
  { line: 'IPD_PRO_13_M5', family: 'PRO', label: 'Pro 13" M5', chip: 'M5', size: 13, gen: 8, year: 2025, storage: S_PRO_M4 },

  { line: 'IPD_AIR_4', family: 'AIR', label: 'Air 4 (A14)', chip: 'A14', size: 10.9, gen: 4, year: 2020, storage: S_64 },
  { line: 'IPD_AIR_5', family: 'AIR', label: 'Air 5 (M1)', chip: 'M1', size: 10.9, gen: 5, year: 2022, storage: S_64 },
  { line: 'IPD_AIR_11_M2', family: 'AIR', label: 'Air 11" M2', chip: 'M2', size: 11, gen: 6, year: 2024, storage: S_AIR },
  { line: 'IPD_AIR_13_M2', family: 'AIR', label: 'Air 13" M2', chip: 'M2', size: 13, gen: 6, year: 2024, storage: S_AIR },
  { line: 'IPD_AIR_11_M3', family: 'AIR', label: 'Air 11" M3', chip: 'M3', size: 11, gen: 7, year: 2025, storage: S_AIR },
  { line: 'IPD_AIR_13_M3', family: 'AIR', label: 'Air 13" M3', chip: 'M3', size: 13, gen: 7, year: 2025, storage: S_AIR },
  { line: 'IPD_AIR_11_M4', family: 'AIR', label: 'Air 11" M4', chip: 'M4', size: 11, gen: 8, year: 2026, storage: S_AIR },
  { line: 'IPD_AIR_13_M4', family: 'AIR', label: 'Air 13" M4', chip: 'M4', size: 13, gen: 8, year: 2026, storage: S_AIR },

  { line: 'IPD_9', family: 'BASE', label: 'iPad 9 (A13)', chip: 'A13', size: 10.2, gen: 9, year: 2021, storage: S_64 },
  { line: 'IPD_10', family: 'BASE', label: 'iPad 10 (A14)', chip: 'A14', size: 10.9, gen: 10, year: 2022, storage: S_64 },
  { line: 'IPD_A16', family: 'BASE', label: 'iPad 11 (A16)', chip: 'A16', size: 11, gen: 11, year: 2025, storage: S_128 },

  { line: 'IPD_MINI_6', family: 'MINI', label: 'mini 6 (A15)', chip: 'A15', size: 8.3, gen: 6, year: 2021, storage: S_64 },
  { line: 'IPD_MINI_7', family: 'MINI', label: 'mini 7 (A17 Pro)', chip: 'A17 Pro', size: 8.3, gen: 7, year: 2024, storage: S_128 },
]

export const IPAD_LINES: IpadLine[] = IPAD_CATALOG.map((e) => e.line)

export const IPAD_LINE_LABEL = Object.fromEntries(IPAD_CATALOG.map((e) => [e.line, e.label])) as Record<IpadLine, string>

export const IPAD_STORAGE_OPTIONS = [64, 128, 256, 512, 1024, 2048]

export function ipadEntry(line: string | null): IpadEntry | undefined {
  return line ? IPAD_CATALOG.find((e) => e.line === line) : undefined
}

export function isIpadLine(line: string | null | undefined): boolean {
  return !!line && line.startsWith('IPD_')
}
