// ── Parser de specs de iPad ──────────────────────────────────────────────────
//
// Mismo contrato que parseSpecs/parseIphone. `line` = modelo (IPD_AIR_11_M2),
// `ssdGb` = almacenamiento. El modelo se resuelve cruzando las señales que el
// vendedor sí escribe (familia, chip, tamaño, generación, año) contra el
// catálogo; si quedan varios candidatos va a revisión en vez de adivinar.

import { IPAD_CATALOG, ipadEntry, type IpadEntry, type IpadFamily, type IpadLine } from './ipad-catalog'
import { SERVICE_RE, detectStorage } from './parse-iphone'
import {
  SWAP_RE, buildConfigKey, detectBattery, detectColor, detectFlags, detectYear, isAccessoryTitle,
  normalizeText, type ParsedSpecs,
} from './parse-specs'

const WANTED_RE = /^(busco|compro|se busca|necesito|quien venda|alguien que venda)\b|\b(busco|compro) (un |una )?i ?pad\b/
const ORD = '(?:a|ra|da|ta|va|na|ma|o|th|rd|nd|st)?'

type Features = { family: IpadFamily | null; chip: string | null; size: number | null; gen: number | null; year: number | null; old: boolean }

function detectFeatures(t: string): Features {
  const family: IpadFamily | null = /\bi ?pad ?pro\b/.test(t) ? 'PRO' : /\bi ?pad ?air\b/.test(t) ? 'AIR' : /\bi ?pad ?mini\b/.test(t) ? 'MINI' : null
  let old = false

  let chip: string | null = null
  const m = t.match(/\bm\s?([1-5])\b/)
  if (m) chip = `M${m[1]}`
  // Pegado ("a14", "a12z"): con espacio choca con "a 12 meses sin intereses"
  const a = t.match(/\ba(8|9|10|11|12|13|14|15|16|17)(x|z)?\b(?:\s?(pro|bionic))?/)
  if (!chip && a) {
    const n = Number(a[1])
    if (n < 12 || (n === 12 && a[2] !== 'z')) old = true // A12/A12X y anteriores: sin iPadOS 27
    else chip = n === 12 ? 'A12Z' : n === 17 ? 'A17 Pro' : `A${n}`
  }

  let size: number | null = null
  const s = t.match(/\b(12[.,]9|13|11|10[.,][259]|9[.,]7|8[.,]3|7[.,]9)\s*(?:in\b|inch|pulgadas|pulg|plg)/)
    ?? t.match(/\bi ?pad ?(?:pro|air)\s*(12[.,]9|13|11)\b(?!\s*(?:gb|tb|gen|ra|da|ta|va))/)
    // Los decimales no se confunden con almacenamiento: cuentan aunque no digan "pulgadas"
    ?? t.match(/\b(12[.,]9|10[.,][259]|9[.,]7|8[.,]3|7[.,]9)\b/)
  if (s) size = Number(s[1].replace(',', '.'))
  if (size && [10.5, 9.7, 7.9].includes(size)) old = true

  let gen: number | null = null
  const g = t.match(new RegExp(`\\b(\\d{1,2})\\s*${ORD}\\s*(?:gen|generacion|generation)\\b`)) ?? t.match(/\bgeneracion\s*(\d{1,2})\b/)
  if (g) gen = Number(g[1])
  else if (family === 'AIR' || family === 'MINI') {
    const b = t.match(family === 'AIR' ? /\bi ?pad ?air\s+([1-8])\b(?![.,]\d)/ : /\bi ?pad ?mini\s+([1-7])\b(?![.,]\d)/)
    if (b) gen = Number(b[1])
  } else if (!family) {
    const b = t.match(new RegExp(`\\bi ?pad\\s+(\\d{1,2})${ORD}\\b(?![.,]\\d)(?!\\s*(?:gb|tb|in\\b|inch|pulg))`))
    if (b && Number(b[1]) >= 2 && Number(b[1]) <= 11) gen = Number(b[1])
  }
  if (gen != null) {
    const fam = family ?? 'BASE'
    if ((fam === 'BASE' && gen <= 8) || (fam === 'AIR' && gen <= 3) || (fam === 'MINI' && gen <= 5)) old = true
    if (fam === 'PRO' && size === 11 && gen === 1) old = true
    if (fam === 'PRO' && size === 12.9 && gen <= 3) old = true
  }

  // 32GB solo existió en iPads que ya no reciben iPadOS 27 (iPad 5–8, mini 4…)
  if (/\b32\s*(?:gb|g|gigas?)\b/.test(t)) old = true

  const year = detectYear(t)
  if (year && year <= 2019 && !chip) old = true
  return { family, chip, size, gen, year, old }
}

function merge(primary: Features, extra: Features): Features {
  return {
    family: primary.family ?? extra.family,
    chip: primary.chip ?? extra.chip,
    size: primary.size ?? extra.size,
    gen: primary.gen ?? extra.gen,
    year: primary.year ?? extra.year,
    old: primary.old || (!primary.chip && !primary.gen && extra.old),
  }
}

const sizeEq = (a: number, b: number) => Math.abs(a - b) < 0.05

function resolve(f: Features, notes: string[]): { line: IpadLine | null; impossible: boolean } {
  const family = f.family ?? 'BASE'
  let cands: IpadEntry[] = IPAD_CATALOG.filter((e) => e.family === family)
  const narrow = (pred: (e: IpadEntry) => boolean) => cands.filter(pred)

  if (f.chip) {
    const c = narrow((e) => e.chip === f.chip)
    if (!c.length) {
      notes.push(`${family === 'BASE' ? 'iPad' : family.toLowerCase()} con ${f.chip} no existe`)
      return { line: null, impossible: true }
    }
    cands = c
  }
  if (f.size) {
    // 10.9" (iPad 10, Air 4/5) y 11" se confunden seguido: exacto primero, luego tolerante
    const exact = narrow((e) => sizeEq(e.size, f.size!))
    const loose = narrow((e) => Math.abs(e.size - f.size!) <= 0.1)
    if (exact.length) cands = exact
    else if (loose.length) cands = loose
    else notes.push(`${f.size}" no cuadra`)
  }
  if (f.gen && cands.length > 1) {
    const c = narrow((e) => e.gen === f.gen)
    if (c.length) cands = c
  }
  if (f.year && cands.length > 1) {
    const c = narrow((e) => e.year === f.year)
    if (c.length) cands = c
  }

  if (cands.length === 1) return { line: cands[0].line, impossible: false }
  const names = cands.slice(0, 3).map((e) => e.label).join(' / ')
  notes.push(`¿${names}${cands.length > 3 ? '…' : ''}?`)
  return { line: null, impossible: false }
}

export function parseIpad(title: string, description?: string | null): ParsedSpecs {
  const titleN = normalizeText(title)
  const all = normalizeText(`${title}\n${description ?? ''}`)
  const notes: string[] = []
  const base: ParsedSpecs = {
    excluded: null, line: null, chip: null, ramGb: null, ssdGb: null, year: null,
    color: null, batteryCycles: null, batteryHealth: null, flags: {},
    parseConfidence: 0, needsReview: true, configKey: null, notes,
  }

  if (!/\bi ?pad(?!os)/.test(all)) return { ...base, excluded: 'no_relevante' }
  if (isAccessoryTitle(titleN, 'i ?pad') || SERVICE_RE.test(titleN)) return { ...base, excluded: 'accesorio' }
  if (WANTED_RE.test(titleN)) return { ...base, excluded: 'busqueda' }
  if (SWAP_RE.test(titleN)) return { ...base, excluded: 'intercambio' }

  // El título manda; la descripción solo rellena lo que el título no dijo
  const desc = normalizeText(description ?? '')
  const f = merge(detectFeatures(titleN), detectFeatures(desc))
  if (f.old) return { ...base, excluded: 'viejo', year: f.year }

  const { line, impossible: badChip } = resolve(f, notes)
  let impossible = badChip
  const ssdGb = detectStorage(titleN, all)
  const { health, cycles } = detectBattery(all)

  let conf = 0
  if (line) conf += 0.6
  if (ssdGb) conf += 0.4
  else notes.push('sin almacenamiento')

  const entry = ipadEntry(line)
  if (entry && ssdGb && !entry.storage.includes(ssdGb)) {
    conf -= 0.35
    impossible = true
    notes.push(`${ssdGb >= 1024 ? `${ssdGb / 1024}TB` : `${ssdGb}GB`} no existe para el ${entry.label}`)
  }
  conf = Math.max(0, Math.min(1, Math.round(conf * 100) / 100))

  const result: ParsedSpecs = {
    excluded: null,
    line, chip: null, ramGb: null, ssdGb,
    year: entry?.year ?? f.year,
    color: detectColor(all),
    batteryCycles: cycles,
    batteryHealth: health,
    flags: detectFlags(all, 'IPAD'),
    parseConfidence: conf,
    needsReview: impossible || conf < 0.7 || !line,
    configKey: null,
    notes,
  }
  result.configKey = buildConfigKey(result)
  return result
}
