// ── Catálogo iPhone (11 en adelante) ─────────────────────────────────────────
//
// Fuente: Wikipedia (List of iPhone models + páginas de cada generación),
// consultado 2026-09. Corte en el iPhone 11 = mismo corte que iOS 26; X/XS/XR
// y anteriores se descartan como "viejo" (igual que Intel en MacBook).
//
// En iPhone el precio lo mueven modelo + almacenamiento; chip y RAM vienen
// fijos por modelo, así que no se parsean.

export type IphoneLine =
  | 'IP_11' | 'IP_11_PRO' | 'IP_11_PRO_MAX' | 'IP_SE_2'
  | 'IP_12_MINI' | 'IP_12' | 'IP_12_PRO' | 'IP_12_PRO_MAX'
  | 'IP_13_MINI' | 'IP_13' | 'IP_13_PRO' | 'IP_13_PRO_MAX' | 'IP_SE_3'
  | 'IP_14' | 'IP_14_PLUS' | 'IP_14_PRO' | 'IP_14_PRO_MAX'
  | 'IP_15' | 'IP_15_PLUS' | 'IP_15_PRO' | 'IP_15_PRO_MAX'
  | 'IP_16' | 'IP_16_PLUS' | 'IP_16_PRO' | 'IP_16_PRO_MAX' | 'IP_16E'
  | 'IP_17' | 'IP_AIR' | 'IP_17_PRO' | 'IP_17_PRO_MAX' | 'IP_17E'
  | 'IP_18_PRO' | 'IP_18_PRO_MAX' | 'IP_DUO'

export type IphoneEntry = { line: IphoneLine; label: string; year: number; storage: number[] }

const S_64 = [64, 128, 256]
const S_PRO_64 = [64, 256, 512]
const S_128 = [128, 256, 512]
const S_1TB = [128, 256, 512, 1024]
const S_256_1TB = [256, 512, 1024]
const S_256_2TB = [256, 512, 1024, 2048]

export const IPHONE_CATALOG: IphoneEntry[] = [
  { line: 'IP_11', label: '11', year: 2019, storage: S_64 },
  { line: 'IP_11_PRO', label: '11 Pro', year: 2019, storage: S_PRO_64 },
  { line: 'IP_11_PRO_MAX', label: '11 Pro Max', year: 2019, storage: S_PRO_64 },
  { line: 'IP_SE_2', label: 'SE (2ª gen)', year: 2020, storage: S_64 },
  { line: 'IP_12_MINI', label: '12 mini', year: 2020, storage: S_64 },
  { line: 'IP_12', label: '12', year: 2020, storage: S_64 },
  { line: 'IP_12_PRO', label: '12 Pro', year: 2020, storage: S_128 },
  { line: 'IP_12_PRO_MAX', label: '12 Pro Max', year: 2020, storage: S_128 },
  { line: 'IP_13_MINI', label: '13 mini', year: 2021, storage: S_128 },
  { line: 'IP_13', label: '13', year: 2021, storage: S_128 },
  { line: 'IP_13_PRO', label: '13 Pro', year: 2021, storage: S_1TB },
  { line: 'IP_13_PRO_MAX', label: '13 Pro Max', year: 2021, storage: S_1TB },
  { line: 'IP_SE_3', label: 'SE (3ª gen)', year: 2022, storage: S_64 },
  { line: 'IP_14', label: '14', year: 2022, storage: S_128 },
  { line: 'IP_14_PLUS', label: '14 Plus', year: 2022, storage: S_128 },
  { line: 'IP_14_PRO', label: '14 Pro', year: 2022, storage: S_1TB },
  { line: 'IP_14_PRO_MAX', label: '14 Pro Max', year: 2022, storage: S_1TB },
  { line: 'IP_15', label: '15', year: 2023, storage: S_128 },
  { line: 'IP_15_PLUS', label: '15 Plus', year: 2023, storage: S_128 },
  { line: 'IP_15_PRO', label: '15 Pro', year: 2023, storage: S_1TB },
  { line: 'IP_15_PRO_MAX', label: '15 Pro Max', year: 2023, storage: S_256_1TB },
  { line: 'IP_16', label: '16', year: 2024, storage: S_128 },
  { line: 'IP_16_PLUS', label: '16 Plus', year: 2024, storage: S_128 },
  { line: 'IP_16_PRO', label: '16 Pro', year: 2024, storage: S_1TB },
  { line: 'IP_16_PRO_MAX', label: '16 Pro Max', year: 2024, storage: S_256_1TB },
  { line: 'IP_16E', label: '16e', year: 2025, storage: S_128 },
  { line: 'IP_17', label: '17', year: 2025, storage: [256, 512] },
  { line: 'IP_AIR', label: 'Air', year: 2025, storage: S_256_1TB },
  { line: 'IP_17_PRO', label: '17 Pro', year: 2025, storage: S_256_1TB },
  { line: 'IP_17_PRO_MAX', label: '17 Pro Max', year: 2025, storage: S_256_2TB },
  { line: 'IP_17E', label: '17e', year: 2026, storage: [256, 512] },
  { line: 'IP_18_PRO', label: '18 Pro', year: 2026, storage: S_256_2TB },
  { line: 'IP_18_PRO_MAX', label: '18 Pro Max', year: 2026, storage: S_256_2TB },
  { line: 'IP_DUO', label: 'Duo (plegable)', year: 2026, storage: S_256_2TB },
]

export const IPHONE_LINES: IphoneLine[] = IPHONE_CATALOG.map((e) => e.line)

export const IPHONE_LINE_LABEL = Object.fromEntries(IPHONE_CATALOG.map((e) => [e.line, e.label])) as Record<IphoneLine, string>

export const IPHONE_STORAGE_OPTIONS = [64, 128, 256, 512, 1024, 2048]

export function iphoneEntry(line: string | null): IphoneEntry | undefined {
  return line ? IPHONE_CATALOG.find((e) => e.line === line) : undefined
}

export function isIphoneLine(line: string | null | undefined): boolean {
  return !!line && line.startsWith('IP_')
}
