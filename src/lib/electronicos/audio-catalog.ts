// ── Catálogo Audífonos (solo tope de gama) ──────────────────────────────────
//
// Fuentes (consultado 2026-09): support.apple.com "Identify your AirPods"
// (modelos + números A####), Sony (WF-1000XM6 feb 2026) y Bose (QC Ultra 2ª gen
// 2025). Solo entran los flagship: AirPods 4/5, Pro 2/3, Max; Sony 1000XM5/XM6;
// Bose QuietComfort Ultra. Lo anterior (AirPods 1–3, Pro 1, XM4…) es "viejo" y
// el resto de Sony/Bose es "gama_baja" — no se tradean equipos baratos.
//
// No hay almacenamiento ni chip: el modelo solo define el precio, así que el
// configKey es el modelo a secas.

export type AudioLine =
  | 'AUD_AIRPODS_4' | 'AUD_AIRPODS_4_ANC' | 'AUD_AIRPODS_5'
  | 'AUD_AIRPODS_PRO_2' | 'AUD_AIRPODS_PRO_3'
  | 'AUD_AIRPODS_MAX' | 'AUD_AIRPODS_MAX_2'
  | 'AUD_SONY_WH_XM5' | 'AUD_SONY_WH_XM6' | 'AUD_SONY_WF_XM5' | 'AUD_SONY_WF_XM6'
  | 'AUD_BOSE_QCU_HP' | 'AUD_BOSE_QCU_HP_2' | 'AUD_BOSE_QCU_EB' | 'AUD_BOSE_QCU_EB_2'

export type AudioEntry = { line: AudioLine; label: string; brand: 'Apple' | 'Sony' | 'Bose'; kind: 'in-ear' | 'diadema'; year: number }

export const AUDIO_CATALOG: AudioEntry[] = [
  { line: 'AUD_AIRPODS_4', label: 'AirPods 4', brand: 'Apple', kind: 'in-ear', year: 2024 },
  { line: 'AUD_AIRPODS_4_ANC', label: 'AirPods 4 ANC', brand: 'Apple', kind: 'in-ear', year: 2024 },
  { line: 'AUD_AIRPODS_5', label: 'AirPods 5', brand: 'Apple', kind: 'in-ear', year: 2026 },
  { line: 'AUD_AIRPODS_PRO_2', label: 'AirPods Pro 2', brand: 'Apple', kind: 'in-ear', year: 2022 },
  { line: 'AUD_AIRPODS_PRO_3', label: 'AirPods Pro 3', brand: 'Apple', kind: 'in-ear', year: 2025 },
  { line: 'AUD_AIRPODS_MAX', label: 'AirPods Max', brand: 'Apple', kind: 'diadema', year: 2020 },
  { line: 'AUD_AIRPODS_MAX_2', label: 'AirPods Max 2', brand: 'Apple', kind: 'diadema', year: 2026 },
  { line: 'AUD_SONY_WH_XM5', label: 'Sony WH-1000XM5', brand: 'Sony', kind: 'diadema', year: 2022 },
  { line: 'AUD_SONY_WH_XM6', label: 'Sony WH-1000XM6', brand: 'Sony', kind: 'diadema', year: 2025 },
  { line: 'AUD_SONY_WF_XM5', label: 'Sony WF-1000XM5', brand: 'Sony', kind: 'in-ear', year: 2023 },
  { line: 'AUD_SONY_WF_XM6', label: 'Sony WF-1000XM6', brand: 'Sony', kind: 'in-ear', year: 2026 },
  { line: 'AUD_BOSE_QCU_HP', label: 'Bose QC Ultra Headphones', brand: 'Bose', kind: 'diadema', year: 2023 },
  { line: 'AUD_BOSE_QCU_HP_2', label: 'Bose QC Ultra Headphones 2', brand: 'Bose', kind: 'diadema', year: 2025 },
  { line: 'AUD_BOSE_QCU_EB', label: 'Bose QC Ultra Earbuds', brand: 'Bose', kind: 'in-ear', year: 2023 },
  { line: 'AUD_BOSE_QCU_EB_2', label: 'Bose QC Ultra Earbuds 2', brand: 'Bose', kind: 'in-ear', year: 2025 },
]

/** Números de modelo de AirPods (support.apple.com), para cuando el vendedor los pone. */
export const AIRPODS_MODEL_NUMBERS: Record<string, AudioLine | 'VIEJO'> = {
  A3531: 'AUD_AIRPODS_5', A3532: 'AUD_AIRPODS_5', A3533: 'AUD_AIRPODS_5',
  A3439: 'AUD_AIRPODS_5', A3440: 'AUD_AIRPODS_5', A3441: 'AUD_AIRPODS_5',
  A3055: 'AUD_AIRPODS_4_ANC', A3056: 'AUD_AIRPODS_4_ANC', A3057: 'AUD_AIRPODS_4_ANC',
  A3050: 'AUD_AIRPODS_4', A3053: 'AUD_AIRPODS_4', A3054: 'AUD_AIRPODS_4',
  A3063: 'AUD_AIRPODS_PRO_3', A3064: 'AUD_AIRPODS_PRO_3', A3065: 'AUD_AIRPODS_PRO_3',
  A3047: 'AUD_AIRPODS_PRO_2', A3048: 'AUD_AIRPODS_PRO_2', A3049: 'AUD_AIRPODS_PRO_2',
  A2931: 'AUD_AIRPODS_PRO_2', A2699: 'AUD_AIRPODS_PRO_2', A2698: 'AUD_AIRPODS_PRO_2',
  A3454: 'AUD_AIRPODS_MAX_2', A3184: 'AUD_AIRPODS_MAX', A2096: 'AUD_AIRPODS_MAX',
  A2564: 'VIEJO', A2565: 'VIEJO', A2083: 'VIEJO', A2084: 'VIEJO',
  A2031: 'VIEJO', A2032: 'VIEJO', A1523: 'VIEJO', A1722: 'VIEJO',
}

export const AUDIO_LINES: AudioLine[] = AUDIO_CATALOG.map((e) => e.line)

export const AUDIO_LINE_LABEL = Object.fromEntries(AUDIO_CATALOG.map((e) => [e.line, e.label])) as Record<AudioLine, string>

export function isAudioLine(line: string | null | undefined): boolean {
  return !!line && line.startsWith('AUD_')
}
