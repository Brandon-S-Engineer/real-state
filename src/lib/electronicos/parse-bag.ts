// ── Parser de Bolsos (marcas que autentica Entrupy) ─────────────────────────
//
// Mismo contrato que los demás parsers. `line` = marca + modelo; sin chip, RAM
// ni almacenamiento. Lo específico de esta categoría:
//   - Réplicas: Marketplace está lleno de "AAA", "calidad espejo", "tipo LV",
//     "inspirada en"… Se descartan antes que nada.
//   - Ropa, perfumes, tenis, lentes y joyería de la misma marca no son bolsos.
//   - Precio muy abajo del piso de la marca = réplica sin decirlo: queda como
//     "sospechoso" y no entra a precios (sí se ve en Listings).

import { BAG_BRANDS, bagLine, bagPriceFloor, type BagBrand } from './bag-catalog'
import { SWAP_RE, buildConfigKey, detectColor, detectFlags, normalizeText, type ParsedSpecs } from './parse-specs'

const WANTED_RE = /^(busco|compro|se busca|necesito|quien venda|alguien que venda|compramos)\b|\b(compro|compramos) (tu |tus )?(bolsas?|bolsos?|carteras?) (de marca|originales?)/
// "no es réplica" es justo lo contrario: se quita antes de buscar
const NOT_REPLICA_RE = /\bno (es|son) (una |un |unos |unas )?(replica|clon|copia|imitacion|generic[oa])s?\b|\bno (replica|clon|copia|imitacion)s?\b|nada de (replica|clon|copia)s?/g
const REPLICA_RE = /\b(replicas?|clon(es)?|imitacion|copia|aaa+|triple a|1[.:]1|calidad espejo|mirror|calidad (premium|original|top|alta)|inspirad[oa]s?|inspiracion|estilo (louis|lv|gucci|chanel|dior|prada|fendi|ysl|celine|goyard|hermes|coach|mcm)|tipo (louis|lv|gucci|chanel|dior|prada|fendi|ysl|celine|goyard|hermes|coach|mcm)|similar a|generic[oa]s?|no original|alternativa|dupe)\b/
// Otros productos de la misma marca (si el título empieza así o los nombra sin decir bolsa)
const OTHER_PRODUCT_RE = /\b(perfumes?|fragancias?|eau de|edp|edt|colonias?|locion|labial|maquillaje|lentes|gafas|anteojos|sunglasses|tenis|sneakers?|zapatos?|zapatillas|sandalias|botas|mocasines|tacones|playeras?|camisas?|camisetas?|sudaderas?|hoodies?|chamarras?|abrigos?|vestidos?|pantalon(es)?|jeans|gorras?|sombreros?|relojes?|collares?|pulseras?|aretes|anillos?|brazaletes?|dijes?|mascadas?|bufandas?|panuelos?|corbatas?|funda|case para|carcasa|llaveros?|charm|calcetines|trajes? de bano|toallas?|cobijas?|cojines?|almohadas?)\b/
const BAG_WORD_RE = /\b(bolsas?|bolsos?|handbags?|bags?|tote|shopper|crossbody|cross ?body|bandolera|clutch|mochilas?|backpack|rinonera|bum ?bag|belt ?bag|pochette|maletas?|maletin|equipaje|duffle|neceser|cosmetiquera|satchel|hobo|bucket|baguette|mini bag|tipo sobre)\b/
const SLG_WORD_RE = /\b(carteras?|billeteras?|wallets?|tarjeteros?|card ?holders?|porta ?tarjetas|monederos?|cinturon(es)?|cintos?|belts?|porta ?pasaporte|key ?pouch|porta ?llaves|cles)\b/
// "Pochette" sola en LV es bolso; "cartera de mano" es clutch
const CLUTCH_RE = /cartera de mano|cartera (de )?(fiesta|noche)/
const DUSTBAG_RE = /dust ?bag|bolsa (protectora|de tela|guardapolvo)|guardapolvo|funda (original|protectora)/
const AUTH_RE = /entrupy|certificad[oa]|certificado de autenticidad|autenticad[oa]|real ?authentication|legit ?(check|grails)|con ticket|nota de compra|comprobante/
const WEAR_RE = /\b(desgaste|esquinas? (gastad|desgastad|pelad)|pelad[oa]s?|manchas?|manchad[oa]|rasgad|roto|rota|descosid|despegad|vachetta oscura|asa oscura|olor)\w*/

function detectBrand(t: string): BagBrand | null {
  let best: { b: BagBrand; at: number } | null = null
  for (const b of BAG_BRANDS) {
    const at = t.search(b.re)
    if (at >= 0 && (!best || at < best.at)) best = { b, at }
  }
  return best?.b ?? null
}

function detectModel(b: BagBrand, t: string): string | null {
  for (const m of b.models) if (m.re.test(t)) return m.key
  return null
}

export function parseBag(title: string, description?: string | null): ParsedSpecs {
  const titleN = normalizeText(title)
  const all = normalizeText(`${title}\n${description ?? ''}`)
  const notes: string[] = []
  const base: ParsedSpecs = {
    excluded: null, line: null, chip: null, ramGb: null, ssdGb: null, year: null,
    color: null, batteryCycles: null, batteryHealth: null, flags: {},
    parseConfidence: 0, needsReview: true, configKey: null, notes,
  }

  if (REPLICA_RE.test(all.replace(NOT_REPLICA_RE, ' '))) return { ...base, excluded: 'replica' }
  if (WANTED_RE.test(titleN)) return { ...base, excluded: 'busqueda' }
  if (SWAP_RE.test(titleN)) return { ...base, excluded: 'intercambio' }

  const brand = detectBrand(titleN) ?? detectBrand(all)
  if (!brand) return { ...base, excluded: 'no_relevante' }

  // El título manda para el tipo de producto
  const model = detectModel(brand, titleN) ?? detectModel(brand, all)
  const bagWord = BAG_WORD_RE.test(titleN) || CLUTCH_RE.test(titleN)
  const slgWord = SLG_WORD_RE.test(titleN) && !CLUTCH_RE.test(titleN)
  const other = OTHER_PRODUCT_RE.test(titleN)
  if (other && !bagWord && !model) return { ...base, excluded: 'accesorio' }

  let line: string | null
  let conf: number
  if (model && !slgWord) { line = bagLine(brand.code, model); conf = 1 }
  else if (slgWord && !bagWord) { line = bagLine(brand.code, 'SLG'); conf = 0.9 }
  else if (bagWord || model) { line = bagLine(brand.code); conf = 0.7; notes.push('modelo no identificado') }
  else {
    // Solo la marca: mira la descripción antes de descartar
    if (BAG_WORD_RE.test(all)) { line = bagLine(brand.code); conf = 0.5; notes.push('el título no dice qué es; la descripción dice bolso') }
    else return { ...base, excluded: 'no_relevante' }
  }

  const flags = detectFlags(all, 'BOLSOS')
  if (DUSTBAG_RE.test(all)) flags.dustBag = true
  if (AUTH_RE.test(all)) flags.autenticado = true
  if (WEAR_RE.test(all.replace(/\b(sin|cero|nada de|ningun) (detalles?|manchas?|desgaste|olor)\b/g, ' '))) flags.detalle = true

  const result: ParsedSpecs = {
    excluded: null,
    line, chip: null, ramGb: null, ssdGb: null, year: null,
    color: detectColor(all),
    batteryCycles: null,
    batteryHealth: null,
    flags,
    parseConfidence: conf,
    needsReview: conf < 0.7,
    configKey: null,
    notes,
  }
  result.configKey = buildConfigKey(result)
  return result
}

/** Precio por debajo del piso de la marca: casi siempre réplica sin decirlo. */
export function isSuspiciousBagPrice(line: string | null | undefined, price: number | null | undefined): boolean {
  return price != null && price > 0 && price < bagPriceFloor(line)
}
