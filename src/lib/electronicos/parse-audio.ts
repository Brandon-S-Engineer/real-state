// ── Parser de Audífonos (AirPods / Sony 1000XM / Bose QC Ultra) ──────────────
//
// Mismo contrato que los demás parsers. `line` = modelo; no hay chip, RAM ni
// almacenamiento. Lo específico de esta categoría:
//   - Réplicas: Marketplace está lleno de AirPods "AAA", "1.1", "Pro 6"… Se
//     descartan antes que nada, o hunden las medianas.
//   - Venta parcial (un solo audífono, solo el estuche): se marca como piezas
//     para que no entre a precios.
//   - Solo tope de gama: el resto de Sony/Bose se descarta como "gama_baja".

import { AIRPODS_MODEL_NUMBERS, AUDIO_CATALOG, type AudioLine } from './audio-catalog'
import {
  SWAP_RE, buildConfigKey, detectBattery, detectColor, detectFlags, detectYear, isAccessoryTitle,
  normalizeText, type ParsedSpecs,
} from './parse-specs'

const WANTED_RE = /^(busco|compro|se busca|necesito|quien venda|alguien que venda)\b|\b(busco|compro) (unos |un )?(air ?pods|audifonos)\b/
// "originales, no son réplica" es justo lo contrario: se quita antes de buscar
const NOT_REPLICA_RE = /\bno (es|son) (una |un |unos |unas )?(replica|clon|copia|generic[oa])s?\b|\bno (replica|clon|copia)s?\b|nada de (replica|clon)s?/g
const REPLICA_RE = /\b(replicas?|clon(es)?|imitacion|copia (exacta|identica|fiel|1[.:]1)|tipo air ?pods|estilo air ?pods|similar(es)? a (los )?(originales?|air ?pods)|aaa|1[.:]1|triple a|clase a|calidad (original|premium)|master copy|inpods|i1[0-9])\b|air ?pods? pro ?[4-9]\b/
// "incluye cable genérico" es un audífono real: genérico solo cuenta en el título
const GENERIC_TITLE_RE = /\bgeneric[oa]s?\b/
const ACCESSORY_START_RE = /^(almohadillas?|cojinetes?|ear ?pads|pads|puntas|tips|gomas|repuesto|correa|llavero)\b|^(case|caja|estuche) de carga\b|\b(solo|solamente|unicamente) (el )?(estuche|case|caja de carga)\b/
const PARTIAL_RE = /\b(solo|solamente|unicamente|nomas) (el |un )?(audifono|auricular|airpod|chicharo)\b|\b(un|1) (solo )?(airpod|chicharo)\b|\b(lado|audifono|auricular|airpod) (izquierdo|derecho)\b|\b(izquierdo|derecho) (solo|nada mas|unicamente)\b/

type Hit = { line: AudioLine | null; old?: boolean; low?: boolean; assumed?: string; note?: string }

function known(code: string): AudioLine | null {
  return AUDIO_CATALOG.some((e) => e.line === code) ? (code as AudioLine) : null
}

function detectApple(t: string): Hit | null {
  if (!/air ?pods?/.test(t)) return null
  const mn = t.match(/\ba\s?(\d{4})\b/)
  const byModel = mn ? AIRPODS_MODEL_NUMBERS[`A${mn[1]}`] : undefined
  if (byModel === 'VIEJO') return { line: null, old: true }
  if (byModel) return { line: byModel }
  const year = detectYear(t)

  if (/air ?pods? ?max/.test(t)) {
    if (/max ?2\b|max (2da|segunda|2nd) gen|max \(2/.test(t) || year === 2026) return { line: 'AUD_AIRPODS_MAX_2' }
    // El Max 2 es de 2026; quien lo vende casi siempre lo dice
    return { line: 'AUD_AIRPODS_MAX', assumed: 'Max sin generación → asumido 1ª gen' }
  }

  if (/air ?pods? ?pro/.test(t)) {
    if (/pro ?1\b|pro (1ra|primera|1st) gen|pro \(1/.test(t) || (year && year <= 2021)) return { line: null, old: true }
    if (/pro ?3\b|pro (3ra|tercera|3rd) gen|pro \(3|ritmo cardiaco|frecuencia cardiaca|heart rate/.test(t) || year === 2025 || year === 2026) return { line: 'AUD_AIRPODS_PRO_3' }
    if (/pro ?2\b|pro (2da|segunda|2nd) gen|pro \(2/.test(t) || (year && year >= 2022 && year <= 2024)) return { line: 'AUD_AIRPODS_PRO_2' }
    if (/\b(2da|segunda|2nd) gen/.test(t)) return { line: 'AUD_AIRPODS_PRO_2' }
    if (/\b(3ra|tercera|3rd) gen/.test(t)) return { line: 'AUD_AIRPODS_PRO_3' }
    return { line: null, note: '¿Pro 1, 2 o 3?' }
  }

  const g = t.match(/air ?pods? ?\(?([1-5])(?:ra|da|ta|a)?\b(?!\s*(?:gb|mil|k\b))/) ?? t.match(/\b([1-5])(?:ra|da|ta|a|st|nd|rd|th)?\s*gen/)
  const words: Record<string, number> = { primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5 }
  const w = t.match(/\b(primera|segunda|tercera|cuarta|quinta) gen/)
  const gen = g ? Number(g[1]) : w ? words[w[1]] : year === 2026 ? 5 : year === 2024 ? 4 : year && year <= 2021 ? 1 : null
  if (gen == null) return { line: null, note: 'AirPods sin generación' }
  if (gen <= 3) return { line: null, old: true }
  if (gen === 5) return { line: 'AUD_AIRPODS_5' }
  return { line: /\banc\b|cancelacion (activa )?de ruido|noise cancel/.test(t) ? 'AUD_AIRPODS_4_ANC' : 'AUD_AIRPODS_4' }
}

function detectSony(t: string): Hit | null {
  const m = t.match(/\b(wh|wf)?[- ]?1000 ?x ?m ?([1-9])\b/) ?? (/\bsony\b/.test(t) ? t.match(/()\bx ?m ?([1-9])\b/) : null)
  if (!m) return /\bsony\b/.test(t) ? { line: null, low: true } : null
  const v = Number(m[2])
  if (v < 5) return { line: null, old: true }
  let kind = m[1] as 'wh' | 'wf' | ''
  let assumed: string | undefined
  if (!kind) {
    if (/earbuds|in ?ear|intraaural|de boton|chicharos|true wireless/.test(t)) kind = 'wf'
    else { kind = 'wh'; assumed = 'no dice WH/WF → asumido diadema (WH)' }
  }
  const line = known(`AUD_SONY_${kind.toUpperCase()}_XM${v}`)
  return line ? { line, assumed } : { line: null, note: `Sony XM${v} no existe` }
}

function detectBose(t: string): Hit | null {
  if (/(quiet ?comfort|\bqc) ?ultra/.test(t)) {
    const eb = /earbuds|in ?ear|de boton|intraaural|chicharos/.test(t)
    const hp = /headphones|diadema|over ?ear/.test(t)
    if (eb === hp) return { line: null, note: '¿QC Ultra audífonos de diadema o earbuds?' }
    const two = /\b(2nd|2da|segunda|2a) gen|gen ?2\b|\(2|ultra 2\b|\b2025\b/.test(t)
    const base = eb ? 'AUD_BOSE_QCU_EB' : 'AUD_BOSE_QCU_HP'
    if (two) return { line: `${base}_2` as AudioLine }
    return { line: base as AudioLine, assumed: /\b(1st|1ra|primera) gen|\b2023\b/.test(t) ? undefined : 'sin generación → asumido 1ª gen' }
  }
  return /\bbose\b|quiet ?comfort|\bqc ?\d/.test(t) ? { line: null, low: true } : null
}

export function parseAudio(title: string, description?: string | null): ParsedSpecs {
  const titleN = normalizeText(title)
  const all = normalizeText(`${title}\n${description ?? ''}`)
  const notes: string[] = []
  const base: ParsedSpecs = {
    excluded: null, line: null, chip: null, ramGb: null, ssdGb: null, year: null,
    color: null, batteryCycles: null, batteryHealth: null, flags: {},
    parseConfidence: 0, needsReview: true, configKey: null, notes,
  }

  if (REPLICA_RE.test(all.replace(NOT_REPLICA_RE, ' ')) || GENERIC_TITLE_RE.test(titleN.replace(NOT_REPLICA_RE, ' '))) return { ...base, excluded: 'replica' }
  if (ACCESSORY_START_RE.test(titleN) || ['air ?pods', 'sony', 'bose', 'xm[56]'].some((d) => isAccessoryTitle(titleN, d))) {
    return { ...base, excluded: 'accesorio' }
  }
  if (WANTED_RE.test(titleN)) return { ...base, excluded: 'busqueda' }
  if (SWAP_RE.test(titleN)) return { ...base, excluded: 'intercambio' }

  // El título manda; la descripción solo si el título no resolvió el modelo
  const detect = (t: string) => detectApple(t) ?? detectSony(t) ?? detectBose(t)
  let hit = detect(titleN)
  if (!hit?.line && !hit?.old) {
    const fromAll = detect(all)
    if (fromAll && (fromAll.line || fromAll.old || !hit)) hit = fromAll
  }
  if (!hit) return { ...base, excluded: 'no_relevante' }
  if (hit.old) return { ...base, excluded: 'viejo' }
  if (hit.low) return { ...base, excluded: 'gama_baja' }
  if (hit.note) notes.push(hit.note)
  if (hit.assumed) notes.push(hit.assumed)

  const line = hit.line
  const flags = detectFlags(all, 'AUDIO')
  if (PARTIAL_RE.test(all)) { flags.piezas = true; notes.push('venta parcial (un solo lado)') }
  const { health, cycles } = detectBattery(all)
  const entry = AUDIO_CATALOG.find((e) => e.line === line)
  const conf = line ? (hit.assumed ? 0.85 : 1) : 0

  const result: ParsedSpecs = {
    excluded: null,
    line, chip: null, ramGb: null, ssdGb: null,
    year: entry?.year ?? null,
    color: detectColor(all),
    batteryCycles: cycles,
    batteryHealth: health,
    flags,
    parseConfidence: conf,
    needsReview: !line,
    configKey: null,
    notes,
  }
  result.configKey = buildConfigKey(result)
  return result
}
