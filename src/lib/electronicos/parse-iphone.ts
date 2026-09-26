// ── Parser de specs de iPhone ────────────────────────────────────────────────
//
// Mismo contrato que parseSpecs (MacBook): devuelve ParsedSpecs para que la
// ingesta, el score y la tabla de precios no distingan categoría. Aquí `line`
// es el modelo (IP_15_PRO_MAX), `ssdGb` el almacenamiento, chip/RAM van null.

import { IPHONE_CATALOG, iphoneEntry, type IphoneLine } from './iphone-catalog'
import {
  SWAP_RE, buildConfigKey, detectBattery, detectColor, detectFlags, isAccessoryTitle,
  normalizeText, type ParsedSpecs,
} from './parse-specs'

const WANTED_RE = /^(busco|compro|se busca|necesito|quien venda|alguien que venda)\b|\b(busco|compro) (un |una )?i ?phone\b/
export const SERVICE_RE = /\b(reparacion|reparamos|servicio tecnico|cambio de (pantalla|bateria|display|centro de carga))\b/

const SUFFIX: Record<string, string> = { 'pro max': '_PRO_MAX', promax: '_PRO_MAX', pm: '_PRO_MAX', max: '_PRO_MAX', pro: '_PRO', plus: '_PLUS', '+': '_PLUS', mini: '_MINI' }

type ModelHit = { line: IphoneLine | null; old?: boolean; note?: string }

function known(code: string): IphoneLine | null {
  return IPHONE_CATALOG.some((e) => e.line === code) ? (code as IphoneLine) : null
}

function detectModel(t: string): ModelHit | null {
  // Air antes que el numérico: "iphone 17 air" no es el 17 base
  if (/\bi ?phone\s*(?:17\s*)?air\b/.test(t)) return { line: 'IP_AIR' }
  if (/\bi ?phone\s*(?:duo|fold|plegable)\b/.test(t)) return { line: 'IP_DUO' }

  let m = t.match(/\bi ?phone\s*(1[6-9])\s?e\b/)
  if (m) {
    const line = known(`IP_${m[1]}E`)
    return line ? { line } : { line: null, note: `iPhone ${m[1]}e no existe` }
  }

  m = t.match(/\bi ?phone\s*se\b(.{0,30})/)
  if (m) {
    const rest = m[1]
    if (/2016|\b1(ra|a|st)?\b|primera/.test(rest)) return { line: null, old: true }
    if (/2022|\b3(ra|a|rd)?\b|tercera|5g/.test(rest)) return { line: 'IP_SE_3' }
    if (/2020|\b2(da|a|nd)?\b|segunda/.test(rest)) return { line: 'IP_SE_2' }
    return { line: null, note: 'SE sin generación' }
  }

  m = t.match(/\bi ?phone\s*(1[1-9])\s*(pro\s*max|promax|pro|plus|mini|max|pm|\+)?(?![a-z0-9])/)
  if (m) {
    const suffix = m[2] ? SUFFIX[m[2].replace(/\s+/g, ' ')] ?? '' : ''
    const line = known(`IP_${m[1]}${suffix}`)
    return line ? { line } : { line: null, note: `iPhone ${m[1]}${m[2] ? ` ${m[2]}` : ''} no existe` }
  }

  // X / XS / XR / 8 / 7… — fuera de soporte de iOS actual
  if (/\bi ?phone\s*(x[rs]?(\s*max)?|[4-8]s?(\s*(plus|\+))?)(?![a-z0-9])/.test(t)) return { line: null, old: true }
  return null
}

export function detectStorage(titleN: string, all: string): number | null {
  for (const t of [titleN, all]) {
    const tb = t.match(/\b([12])\s*(?:tb|teras?)\b/)
    if (tb) return Number(tb[1]) * 1024
    const gb = t.match(/\b(64|128|256|512)\s*(?:gb|g|gigas?)\b/)
    if (gb) return Number(gb[1])
  }
  // "iPhone 13 Pro 256 liberado" — número suelto solo en el título
  const bare = titleN.match(/(?<![\d,.$])\b(64|128|256|512)\b(?!\s*(?:mil|k|\$|pesos|mxn))/)
  return bare ? Number(bare[1]) : null
}

const COLORS: [RegExp, string][] = [
  [/titanio natural|natural titanio|natural titanium/, 'Titanio natural'],
  [/titanio (negro|black)|black titanium/, 'Titanio negro'],
  [/titanio (blanco|white)|white titanium/, 'Titanio blanco'],
  [/titanio (desierto|desert)|desert titanium/, 'Titanio desierto'],
  [/titanio azul|azul titanio|blue titanium/, 'Titanio azul'],
  [/cosmic orange|naranja/, 'Naranja cósmico'],
  [/deep blue|azul (profundo|oscuro)/, 'Azul profundo'],
  [/lavanda|lavender/, 'Lavanda'],
  [/salvia|sage/, 'Salvia'],
  [/morad[oa]|purple|deep purple/, 'Morado'],
  [/\brojo\b|\bred\b/, 'Rojo'],
  [/\bverde\b|\bgreen\b/, 'Verde'],
  [/\bazul\b|\bblue\b/, 'Azul'],
  [/\bblanc[oa]\b|\bwhite\b/, 'Blanco'],
]

export function parseIphone(title: string, description?: string | null): ParsedSpecs {
  const titleN = normalizeText(title)
  const all = normalizeText(`${title}\n${description ?? ''}`)
  const notes: string[] = []
  const base: ParsedSpecs = {
    excluded: null, line: null, chip: null, ramGb: null, ssdGb: null, year: null,
    color: null, batteryCycles: null, batteryHealth: null, flags: {},
    parseConfidence: 0, needsReview: true, configKey: null, notes,
  }

  if (!/\bi ?phone/.test(all)) return { ...base, excluded: 'no_relevante' }
  if (isAccessoryTitle(titleN, 'i ?phone')) return { ...base, excluded: 'accesorio' }
  if (SERVICE_RE.test(titleN)) return { ...base, excluded: 'accesorio' }
  if (WANTED_RE.test(titleN)) return { ...base, excluded: 'busqueda' }
  if (SWAP_RE.test(titleN)) return { ...base, excluded: 'intercambio' }

  // El título manda: la descripción a veces lista "también tengo un 12…"
  const hit = detectModel(titleN) ?? detectModel(all)
  if (hit?.old) return { ...base, excluded: 'viejo' }
  if (hit?.note) notes.push(hit.note)
  const line = hit?.line ?? null

  const ssdGb = detectStorage(titleN, all)
  const { health, cycles } = detectBattery(all)
  const flags = detectFlags(all, 'IPHONE')

  let conf = 0
  let impossible = false
  if (line) conf += 0.6
  else if (!hit?.note) notes.push('sin modelo')
  if (ssdGb) conf += 0.4
  else notes.push('sin almacenamiento')

  const entry = iphoneEntry(line)
  if (entry && ssdGb && !entry.storage.includes(ssdGb)) {
    conf -= 0.35
    impossible = true
    notes.push(`${ssdGb >= 1024 ? `${ssdGb / 1024}TB` : `${ssdGb}GB`} no existe para el ${entry.label}`)
  }
  if (hit?.note && !line) impossible = true

  conf = Math.max(0, Math.min(1, Math.round(conf * 100) / 100))
  let color: string | null = null
  for (const [re, name] of COLORS) if (re.test(all)) { color = name; break }

  const result: ParsedSpecs = {
    excluded: null,
    line, chip: null, ramGb: null, ssdGb,
    year: entry?.year ?? null,
    color: color ?? detectColor(all),
    batteryCycles: cycles,
    batteryHealth: health,
    flags,
    parseConfidence: conf,
    needsReview: impossible || conf < 0.7 || !line,
    configKey: null,
    notes,
  }
  result.configKey = buildConfigKey(result)
  return result
}
