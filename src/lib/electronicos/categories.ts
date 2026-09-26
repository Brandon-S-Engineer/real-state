// ── Categorías (MacBook / iPhone / iPad) ─────────────────────────────────────
//
// Mismas tablas y mismo pipeline; lo que cambia por categoría es el parser y
// qué specs importan. Sin prisma: se usa también en el cliente.

import { LINES, LINE_LABEL, formatSsd, type Line } from './catalog'
import { IPHONE_LINES, IPHONE_LINE_LABEL, IPHONE_STORAGE_OPTIONS, isIphoneLine } from './iphone-catalog'
import { IPAD_LINES, IPAD_LINE_LABEL, IPAD_STORAGE_OPTIONS, isIpadLine } from './ipad-catalog'
import { isStorageOnlyLine, normalizeText, parseSpecs, type DeviceCategory, type ParsedSpecs } from './parse-specs'
import { parseIphone } from './parse-iphone'
import { parseIpad } from './parse-ipad'

export type Category = DeviceCategory

export const CATEGORIES: Category[] = ['MACBOOK', 'IPHONE', 'IPAD']

export function parseCategory(v: string | null | undefined): Category | undefined {
  return CATEGORIES.includes(v as Category) ? (v as Category) : undefined
}

export const CATEGORY_META: Record<Category, {
  label: string
  path: string
  subtitle: string
  lines: string[]
  lineLabel: Record<string, string>
  hasChip: boolean
  storageLabel: string
  storageOptions: number[]
  emptyHint: string
}> = {
  MACBOOK: {
    label: 'MacBook',
    path: '/dashboard/macbook',
    subtitle: 'M1–M5 y Neo',
    lines: LINES,
    lineLabel: LINE_LABEL,
    hasChip: true,
    storageLabel: 'SSD',
    storageOptions: [256, 512, 1024, 2048, 4096],
    emptyHint: 'abre Marketplace con la extensión activa y scrollea una búsqueda de MacBook',
  },
  IPHONE: {
    label: 'iPhone',
    path: '/dashboard/iphone',
    subtitle: 'iPhone 11 en adelante',
    lines: IPHONE_LINES,
    lineLabel: IPHONE_LINE_LABEL,
    hasChip: false,
    storageLabel: 'Almacenamiento',
    storageOptions: IPHONE_STORAGE_OPTIONS,
    emptyHint: 'abre Marketplace con la extensión activa y scrollea una búsqueda de iPhone',
  },
  IPAD: {
    label: 'iPad',
    path: '/dashboard/ipad',
    subtitle: 'Soportados por iPadOS 27',
    lines: IPAD_LINES,
    lineLabel: IPAD_LINE_LABEL,
    hasChip: false,
    storageLabel: 'Almacenamiento',
    storageOptions: IPAD_STORAGE_OPTIONS,
    emptyHint: 'abre Marketplace con la extensión activa y scrollea una búsqueda de iPad',
  },
}

export function categoryOfLine(line: string | null | undefined): Category {
  return isIphoneLine(line) ? 'IPHONE' : isIpadLine(line) ? 'IPAD' : 'MACBOOK'
}

const DEVICE_RE: [Category, RegExp][] = [
  ['MACBOOK', /mac ?book/],
  ['IPHONE', /\bi ?phone/],
  ['IPAD', /\bi ?pad(?!os)/],
]

/** Gana lo que aparezca primero en el título; si no dice, la descripción. */
export function detectCategory(title: string, description?: string | null): Category | null {
  for (const raw of [title, description ?? '']) {
    const t = normalizeText(raw)
    let best: { c: Category; at: number } | null = null
    for (const [c, re] of DEVICE_RE) {
      const at = t.search(re)
      if (at >= 0 && (!best || at < best.at)) best = { c, at }
    }
    if (best) return best.c
  }
  return null
}

const PARSERS: Record<Category, (title: string, description?: string | null) => ParsedSpecs> = {
  MACBOOK: parseSpecs,
  IPHONE: parseIphone,
  IPAD: parseIpad,
}

export function parseListing(title: string, description?: string | null): ParsedSpecs & { category: Category } {
  const category = detectCategory(title, description) ?? 'MACBOOK'
  return { ...PARSERS[category](title, description), category }
}

export function lineLabel(line: string | null): string {
  if (!line) return '?'
  return IPHONE_LINE_LABEL[line as keyof typeof IPHONE_LINE_LABEL]
    ?? IPAD_LINE_LABEL[line as keyof typeof IPAD_LINE_LABEL]
    ?? LINE_LABEL[line as Line]
    ?? line
}

export function configShort(l: { line: string | null; chip: string | null; ramGb: number | null; ssdGb: number | null }): string {
  if (isStorageOnlyLine(l.line)) return `${lineLabel(l.line)} · ${formatSsd(l.ssdGb)}`
  return `${lineLabel(l.line)} · ${l.chip ?? '?'} · ${l.ramGb ? `${l.ramGb}GB` : '?'} · ${formatSsd(l.ssdGb)}`
}

/** Inverso de buildConfigKey, para mostrar un filtro de config. */
export function parseConfigKey(key: string): { line: string | null; chip: string | null; ramGb: number | null; ssdGb: number | null } {
  const p = key.split('|')
  if (isStorageOnlyLine(p[0])) return { line: p[0], chip: null, ramGb: null, ssdGb: Number(p[1]) || null }
  return { line: p[0] || null, chip: p[1] || null, ramGb: Number(p[2]) || null, ssdGb: Number(p[3]) || null }
}

/**
 * Grupo "grueso" de respaldo cuando la config exacta tiene poca muestra:
 * MacBook → línea+chip · iPhone/iPad → modelo (sin almacenamiento).
 */
export function coarseKey(l: { line: string | null; chip: string | null }): string | null {
  if (isStorageOnlyLine(l.line)) return l.line
  return l.line && l.chip ? `${l.line}|${l.chip}` : null
}

export function coarseLabel(line: string | null): string {
  return isStorageOnlyLine(line) ? 'modelo' : 'línea+chip'
}
