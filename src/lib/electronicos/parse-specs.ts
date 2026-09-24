// ── Parser de specs de MacBook (título + descripción en texto libre) ─────────
//
// Regex + heurísticas + validación contra el catálogo. Los posts de grupos son
// mucho más desordenados que Marketplace, así que todo es tolerante: cada campo
// es opcional y la confianza final decide si el listing va a revisión manual.
//
// Hook de IA: `aiParseSpecs` está listo para enchufar un modelo después. Hoy
// devuelve null (no-op) y el flujo usa solo el parser determinístico.

import { CATALOG, MODEL_NUMBERS, findEntries, linesForChip, type Line } from './catalog'

export type SpecFlags = {
  conCaja?: boolean
  factura?: boolean
  appleCare?: boolean
  garantia?: boolean
  detalle?: boolean
  golpe?: boolean
  pantallaRota?: boolean
  piezas?: boolean // para piezas / no enciende / bloqueada
  nueva?: boolean // sellada / sin abrir
  vendido?: boolean // el propio texto dice "vendido"
}

export type ExcludedReason = 'no_macbook' | 'intel' | 'accesorio' | 'busqueda' | 'intercambio'

export type ParsedSpecs = {
  excluded: ExcludedReason | null
  line: Line | null
  chip: string | null
  ramGb: number | null
  ssdGb: number | null
  year: number | null
  color: string | null
  batteryCycles: number | null
  batteryHealth: number | null
  flags: SpecFlags
  parseConfidence: number
  needsReview: boolean
  configKey: string | null
  notes: string[] // por qué la confianza es la que es (se muestra en la UI)
}

const RAM_VALUES = [8, 16, 18, 24, 32, 36, 48, 64, 96, 128]

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[”“″"]/g, ' in ')
    .replace(/[’′']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normSsd(value: number, unit: string | undefined): number | null {
  if (unit === 'tb' || (!unit && value <= 8)) return value * 1024
  if (value === 500) return 512
  if (value === 250 || value === 240) return 256
  if (value === 1000) return 1024
  if (value === 2000) return 2048
  if ([128, 256, 512, 1024, 2048, 4096, 8192].includes(value)) return value
  return null
}

export function buildConfigKey(p: { line: string | null; chip: string | null; ramGb: number | null; ssdGb: number | null }): string | null {
  if (!p.line || !p.chip) return null
  return `${p.line}|${p.chip}|${p.ramGb ?? '?'}|${p.ssdGb ?? '?'}`
}

// ── Detecciones puntuales ─────────────────────────────────────────────────────

const ACCESSORY_RE = /^(funda|cargador|teclado|teclados|pantalla|display|bateria|mouse|magic|estuche|protector|mica|skin|hub|adaptador|cable|bolsa|mochila|base|soporte|carcasa|cubierta|tapa|logic ?board|placa|board|bisagra)\b/
const ACCESSORY_ANYWHERE_RE = /\b(funda|cargador|estuche|mochila|hub usb|adaptador) (para|de|compatible)\b|\bpara mac ?book\b/
const WANTED_RE = /^(busco|compro|se busca|necesito|quien venda|alguien que venda)\b|\b(busco|compro) (una |un )?mac ?book\b/
const SWAP_RE = /^cambio\b|\bcambio (mi )?mac ?book\b|\bintercambio\b/

function detectChip(t: string): string | null {
  if (/\bneo\b/.test(t) || /\ba18\b/.test(t)) return 'A18 Pro'
  // "m3 pro", "m4max", "chip m2" — el sufijo solo cuenta si va pegado al chip
  const m = t.match(/\bm\s?([1-5])(?:\s?(pro|max|ultra))?\b/)
  if (!m) return null
  const base = `M${m[1]}`
  if (m[2] === 'pro' || m[2] === 'max') {
    // "MacBook Pro M3 Pro 14" → M3 Pro. Pero "M2 Pro 13" (texto de alguien que
    // quiso decir MacBook Pro M2 13") no existe → si viene 13" es chip base.
    if (/\b13\b/.test(t) && (base === 'M1' || base === 'M2')) return base
    return `${base} ${m[2] === 'pro' ? 'Pro' : 'Max'}`
  }
  return base
}

function detectFamily(t: string, chip: string | null): 'AIR' | 'PRO' | 'NEO' | null {
  if (chip === 'A18 Pro' || /\bneo\b/.test(t)) return 'NEO'
  if (/\bair\b/.test(t)) return 'AIR'
  // quitar el sufijo del chip antes de buscar "pro" como línea
  const withoutChip = t.replace(/\bm\s?[1-5]\s?(pro|max)\b/g, ' ')
  if (/mac ?book ?pro\b|\bpro\b/.test(withoutChip)) return 'PRO'
  if (chip && /(Pro|Max)$/.test(chip)) return 'PRO'
  return null
}

function detectSize(t: string): number | null {
  // 14", 16 pulgadas, 15-inch, "pro 14", "air 15"
  let m = t.match(/\b(13|14|15|16)(?:[.,]\d)?\s*(?:in\b|inch|-inch|pulgadas|pulg|pulgs|plg|pulgada)/)
  if (m) return Number(m[1])
  m = t.match(/\b(?:air|pro)\s*(13|14|15|16)\b(?!\s*(?:gb|\/|ram|core|c\b))/)
  if (m) return Number(m[1])
  return null
}

function detectRamSsd(t: string): { ram: number | null; ssd: number | null } {
  let ram: number | null = null
  let ssd: number | null = null

  // "16/256", "8gb/512gb", "16 / 1tb" (no "16c/40c" de núcleos)
  const pair = t.match(/\b(8|16|18|24|32|36|48|64|96|128)\s*(?:gb)?\s*[\/|]\s*(\d{1,4})\s*(tb|gb)?\b(?!\s*c\b)/)
  if (pair && !/\d\s*c\s*\//.test(pair[0])) {
    const s = normSsd(Number(pair[2]), pair[3])
    if (s && s >= 256) {
      ram = Number(pair[1])
      ssd = s
    }
  }

  if (ram === null) {
    const ramPatterns = [
      /\b(\d{1,3})\s*gb\s*(?:de\s*)?(?:ram|memoria|unificada|de ram)\b/,
      /\b(\d{1,3})\s*(?:ram)\b/,
      /\b(?:ram|memoria)\s*(?:de\s*)?(\d{1,3})\s*(?:gb)?\b/,
    ]
    for (const re of ramPatterns) {
      const r = t.match(re)
      if (r && RAM_VALUES.includes(Number(r[1]))) { ram = Number(r[1]); break }
    }
  }

  if (ssd === null) {
    const s =
      t.match(/\b(\d{1,4})\s*(tb|gb)?\s*(?:de\s*)?(?:ssd|almacenamiento|disco|storage)\b/) ??
      t.match(/\b(?:ssd|almacenamiento|disco|storage)\s*(?:de\s*)?(\d{1,4})\s*(tb|gb)?\b/)
    if (s) ssd = normSsd(Number(s[1]), s[2])
  }

  if (ssd === null) {
    // "1 TB", "2tb" sueltos
    const s = t.match(/\b([1248])\s*tb\b/)
    if (s) ssd = Number(s[1]) * 1024
  }

  // Números sueltos con "gb": ≥256 es SSD; valores de RAM válidos son RAM
  for (const m of t.matchAll(/\b(\d{1,4})\s*gb\b/g)) {
    const v = Number(m[1])
    if (ssd === null && v >= 240) ssd = normSsd(v, 'gb')
    else if (ram === null && RAM_VALUES.includes(v) && v !== (ssd ?? -1)) ram = v
  }

  return { ram, ssd }
}

function detectYear(t: string): number | null {
  const m = t.match(/\b(20(?:0\d|1\d|2[0-6]))\b/)
  return m ? Number(m[1]) : null
}

function detectBattery(t: string): { health: number | null; cycles: number | null } {
  let health: number | null = null
  let cycles: number | null = null
  const h =
    t.match(/(\d{2,3})\s*%\s*(?:de\s*)?(?:bat|condici|salud|health|vida|capacidad)/) ??
    t.match(/(?:bateria|salud|condicion|health|capacidad)[^\d%]{0,25}(\d{2,3})\s*%/) ??
    t.match(/\b(\d{2,3})\s*%/)
  if (h) {
    const v = Number(h[1])
    if (v >= 50 && v <= 100) health = v
  }
  const c =
    t.match(/(\d{1,4})\s*(?:ciclos|ciclo|cycles|cycle)\b/) ??
    t.match(/(?:ciclos|cycles)[^\d]{0,12}(\d{1,4})\b/)
  if (c) {
    const v = Number(c[1])
    if (v >= 0 && v <= 3000) cycles = v
  }
  return { health, cycles }
}

const COLORS: [RegExp, string][] = [
  [/space ?black|negro espacial|negro/, 'Negro espacial'],
  [/space ?gr[ae]y|gris espacial|gris/, 'Gris espacial'],
  [/starlight|luz estelar|blanco estelar|estelar/, 'Blanco estelar'],
  [/midnight|medianoche/, 'Medianoche'],
  [/sky ?blue|azul cielo/, 'Azul cielo'],
  [/silver|plata|plateada|plateado/, 'Plata'],
  [/\bgold\b|dorad[ao]/, 'Dorado'],
  [/blush|rosa/, 'Rosa'],
  [/citrus|citrico|amarill/, 'Cítrico'],
  [/indigo/, 'Índigo'],
]

function detectColor(t: string): string | null {
  for (const [re, name] of COLORS) if (re.test(t)) return name
  return null
}

function detectFlags(t: string): SpecFlags {
  const f: SpecFlags = {}
  if (/\b(con|en|incluye|y) (su )?caja\b|caja original|\bcon empaque\b/.test(t)) f.conCaja = true
  if (/\bfactura\b|\bticket\b/.test(t)) f.factura = true
  if (/apple ?care/.test(t)) f.appleCare = true
  if (/garantia/.test(t)) f.garantia = true
  if (/\bdetalle|detallito|rayon|rayada|rayado|marcas de uso|desgaste/.test(t)) f.detalle = true
  if (/golpe|abollad|chocad|sumid/.test(t)) f.golpe = true
  if (/pantalla (rota|estrellada|danada|quebrada|con lineas|manchada)|display roto|lineas en (la )?pantalla|mancha en (la )?pantalla/.test(t)) f.pantallaRota = true
  if (/(para|por) (piezas|refacciones)|\bpiezas\b|refaccion|no enciende|no prende|no sirve|bloquead|icloud|\bmdm\b|placa danada/.test(t)) f.piezas = true
  if (/\bsellad[ao]\b|sin abrir|nueva en caja|\bnueva\b(?! como)|\bnuevo\b(?! como)/.test(t) && !/como nuev|semi ?nuev|casi nuev/.test(t)) f.nueva = true
  if (/\bvendid[ao]\b|\bsold\b|ya se vendio/.test(t)) f.vendido = true
  return f
}

function detectIntel(t: string, chip: string | null, year: number | null): boolean {
  if (chip) return false
  if (/\bintel\b|\bcore ?i[3579]\b|\bi[3579]\b|\bi[3579]-\d/.test(t)) return true
  if (/\b(mid|late|early) 20(0\d|1\d)\b/.test(t)) return true
  if (year !== null && year <= 2019) return true
  if (/\bretina\b/.test(t) && year !== null && year < 2020) return true
  return false
}

// ── API principal ────────────────────────────────────────────────────────────

export function parseSpecs(title: string, description?: string | null): ParsedSpecs {
  const titleN = normalizeText(title)
  const all = normalizeText(`${title}\n${description ?? ''}`)
  const notes: string[] = []

  const base: ParsedSpecs = {
    excluded: null, line: null, chip: null, ramGb: null, ssdGb: null, year: null,
    color: null, batteryCycles: null, batteryHealth: null, flags: {},
    parseConfidence: 0, needsReview: true, configKey: null, notes,
  }

  if (!/mac ?book/.test(all)) return { ...base, excluded: 'no_macbook' }
  if (ACCESSORY_RE.test(titleN) || ACCESSORY_ANYWHERE_RE.test(titleN)) return { ...base, excluded: 'accesorio' }
  if (WANTED_RE.test(titleN)) return { ...base, excluded: 'busqueda' }
  if (SWAP_RE.test(titleN)) return { ...base, excluded: 'intercambio' }

  // El título manda: specs en la descripción ("también tengo una M1…") son más ruidosos.
  let chip = detectChip(titleN) ?? detectChip(all)
  const year = detectYear(titleN) ?? detectYear(all)
  const family = detectFamily(titleN, chip) ?? detectFamily(all, chip)
  const size = detectSize(titleN) ?? detectSize(all)
  let line: Line | null = null

  // Número de modelo (A2338, A3113…)
  const modelMatch = all.match(/\ba\s?(\d{4})\b/)
  if (modelMatch) {
    const model = MODEL_NUMBERS[`A${modelMatch[1]}`]
    if (model === 'INTEL') return { ...base, excluded: 'intel' }
    if (model) {
      line = model.line
      if (!chip && model.chip) { chip = model.chip; notes.push(`chip por modelo A${modelMatch[1]}`) }
    }
  }

  if (detectIntel(all, chip, year)) return { ...base, excluded: 'intel', year }
  // MacBook Pro 15" solo existió con Intel
  if (!chip && family === 'PRO' && size === 15) return { ...base, excluded: 'intel', year }

  // Resolver línea
  if (!line) {
    if (family === 'NEO') line = 'NEO_13'
    else if (family === 'AIR') {
      if (size === 15) line = 'AIR_15'
      else if (size === 13 || !size) {
        line = 'AIR_13'
        if (!size && chip && chip !== 'M1') notes.push('Air sin tamaño → asumido 13"')
      }
    } else if (family === 'PRO') {
      if (size === 13) line = 'PRO_13'
      else if (size === 14) line = 'PRO_14'
      else if (size === 16) line = 'PRO_16'
      else if (chip) {
        const lines = linesForChip(chip).filter((l) => l.startsWith('PRO'))
        if (lines.length === 1) { line = lines[0]; notes.push(`tamaño inferido del chip (${chip})`) }
        else if (lines.length > 1) notes.push(`${chip}: ¿14" o 16"?`)
      }
    } else if (chip) {
      const lines = linesForChip(chip)
      if (lines.length === 1) { line = lines[0]; notes.push('línea inferida del chip') }
      else notes.push('no dice si es Air o Pro')
    }
  }

  // Chip ausente: inferir si la línea+año lo determinan
  if (!chip && line) {
    const cands = CATALOG.filter((e) => e.line === line && (!year || e.year === year))
    const chips = Array.from(new Set(cands.flatMap((e) => e.chips)))
    if (chips.length === 1) { chip = chips[0]; notes.push('chip inferido de línea/año') }
  }
  if (line === 'NEO_13') chip = 'A18 Pro'

  // "Pro 14" M1 2021" → en 14"/16" el M1/M2 base no existe: es M1 Pro/M2 Pro
  if (line && chip && findEntries(line, chip).length === 0 && /^M[1-5]$/.test(chip) && findEntries(line, `${chip} Pro`).length) {
    notes.push(`${chip} en ${line === 'PRO_16' ? '16' : '14'}" → asumido ${chip} Pro`)
    chip = `${chip} Pro`
  }

  const { ram: ramRaw, ssd: ssdRaw } = detectRamSsd(titleN)
  const fromAll = detectRamSsd(all)
  let ramGb = ramRaw ?? fromAll.ram
  const ssdGb = ssdRaw ?? fromAll.ssd
  if (line === 'NEO_13' && !ramGb) ramGb = 8

  const { health, cycles } = detectBattery(all)
  const flags = detectFlags(all)

  // ── Confianza ──────────────────────────────────────────────────────────────
  let conf = 0
  if (line) conf += notes.some((n) => n.includes('inferid') || n.includes('asumido')) ? 0.2 : 0.3
  if (chip) conf += 0.3
  if (ramGb) conf += 0.2
  if (ssdGb) conf += 0.2

  // impossible = la combinación no existe en ningún modelo real. Es un caso
  // distinto a "confianza baja": no es que falte información, es que algo
  // contradice al catálogo (p.ej. "M1" + 32GB — el M1 base tope es 16GB, así
  // que probablemente el vendedor quiso decir M1 Pro/Max). Nunca se acepta en
  // automático, sin importar cuántos otros campos sí se detectaron bien.
  let impossible = false
  const entries = line && chip ? findEntries(line, chip) : []
  if (line && chip && entries.length === 0) {
    conf -= 0.3
    impossible = true
    notes.push(`${chip} no existe en esa línea`)
  }
  if (entries.length) {
    if (ramGb && !entries.some((e) => e.ram.includes(ramGb!))) {
      conf -= 0.35
      impossible = true
      notes.push(`${ramGb}GB RAM no existe para ${chip}`)
    }
    if (ssdGb && !entries.some((e) => e.ssd.includes(ssdGb!))) { conf -= 0.1; notes.push(`SSD ${ssdGb}GB raro para ${chip}`) }
    if (year && !entries.some((e) => Math.abs(e.year - year) <= 1)) notes.push(`año ${year} no cuadra con ${chip}`)
    // Si solo hay una RAM posible (Neo), rellenar
    const ramOpts = Array.from(new Set(entries.flatMap((e) => e.ram)))
    if (!ramGb && ramOpts.length === 1) ramGb = ramOpts[0]
  }
  if (!ramGb) notes.push('sin RAM')
  if (!ssdGb) notes.push('sin SSD')

  conf = Math.max(0, Math.min(1, Math.round(conf * 100) / 100))

  const result: ParsedSpecs = {
    excluded: null,
    line, chip, ramGb, ssdGb, year,
    color: detectColor(all),
    batteryCycles: cycles,
    batteryHealth: health,
    flags,
    parseConfidence: conf,
    needsReview: impossible || conf < 0.7 || !line || !chip,
    configKey: null,
    notes,
  }
  result.configKey = buildConfigKey(result)
  return result
}

/**
 * Hook para parseo con IA (pendiente). Cuando se implemente, se llamará solo
 * para listings con parseConfidence < 0.7 y su resultado se mezcla sobre el del
 * parser determinístico. Devolver null = sin cambios.
 */
export async function aiParseSpecs(_input: { title: string; description?: string | null }): Promise<Partial<ParsedSpecs> | null> {
  return null
}

// ── Precio desde texto libre (posts de grupos) ───────────────────────────────

export function parsePriceFromText(text: string): number | null {
  const t = normalizeText(text)
  const candidates: number[] = []
  for (const m of t.matchAll(/(?:\$|mx\$|precio:?|en)\s*(\d{1,3}(?:[,.]\d{3})+|\d{4,6})(?:\s*(?:mxn|pesos|mn))?/g)) {
    candidates.push(Number(m[1].replace(/[,.]/g, '')))
  }
  for (const m of t.matchAll(/\b(\d{1,3}(?:[,.]\d{3})+|\d{4,6})\s*(?:mxn|pesos|mn)\b/g)) {
    candidates.push(Number(m[1].replace(/[,.]/g, '')))
  }
  for (const m of t.matchAll(/\b(\d{1,2}(?:[.,]\d)?)\s*(?:k|mil)\b/g)) {
    candidates.push(Math.round(Number(m[1].replace(',', '.')) * 1000))
  }
  const valid = candidates.filter((n) => n >= 2000 && n <= 150000)
  return valid.length ? valid[0] : null
}
