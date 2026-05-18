import { chromium, type Page } from "playwright"
import { MAX_PAGES, PAGE_DELAY_MS, SELECTORS, type ZoneConfig } from "./config.js"

export interface RawListing {
  sourceId: string
  sourceUrl: string
  title: string
  zona: string
  desarrollo: string | null
  price: number | null
  m2Constructed: number | null
  m2Total: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  images: string[]
  amenities: string[]
  postingType: "RESULT" | "DEVELOPMENT" | "OTHER"
}

// ── Parsers ────────────────────────────────────────────────────────────────────

function parsePrice(raw: string): number | null {
  // "MN 9,660,000" | "USD 1,500,000" | "Departamentos desde\nMN 9,660,000"
  // Quedarse solo con dígitos y punto decimal
  const cleaned = raw.replace(/[^0-9.]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) || num === 0 ? null : num
}

function parseM2(text: string): number | null {
  // "161 m² lote" | "120 m²" | "85.5 m² const." | "250.76 m²" | "236. 5 m2" (roto)
  // Toma solo la parte entera — los decimales se ignoran para evitar que
  // "250. 76 m²" se parsee como 76 (espacio después del punto).
  const match = text.match(/(\d+)(?:[.,]\s*\d+)?\s*m[²2]/i)
  if (!match) return null
  const num = parseInt(match[1], 10)
  return isNaN(num) || num === 0 ? null : num
}

function parseCount(text: string): number | null {
  const match = text.match(/^(\d+(?:\.\d+)?)/)
  if (!match) return null
  const num = parseFloat(match[1])
  return isNaN(num) ? null : num
}

function detectDesarrollo(title: string, keywords: string[]): string | null {
  const lower = title.toLowerCase()
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw
  }
  return null
}

// ── Feature span parser ────────────────────────────────────────────────────────
// Spans: "3 rec." | "2 baños" | "120 m²" | "161 m² lote" | "2 caj." | "356 un."

function parseFeatures(spans: string[]): {
  bedrooms: number | null
  bathrooms: number | null
  m2Constructed: number | null
  m2Total: number | null
  parkingSpaces: number | null
} {
  let bedrooms: number | null = null
  let bathrooms: number | null = null
  let parkingSpaces: number | null = null

  // m² puede aparecer con varias etiquetas — los recolectamos por tipo
  let m2Construct: number | null = null
  let m2Lote: number | null = null
  let m2Unknown: number | null = null

  for (const raw of spans) {
    const text = raw.trim()
    if (!text) continue

    if (/rec\.|recámara|recamara|hab\./i.test(text)) {
      bedrooms = bedrooms ?? parseCount(text)
    } else if (/ba[ñn]/i.test(text)) {
      bathrooms = bathrooms ?? parseCount(text)
    } else if (/caj\.|cajón|cajon|estac/i.test(text)) {
      parkingSpaces = parkingSpaces ?? parseCount(text)
    } else if (/m[²2]/i.test(text)) {
      if (/const\.|construid/i.test(text)) {
        m2Construct = m2Construct ?? parseM2(text)
      } else if (/lote|tot\.|terreno/i.test(text)) {
        m2Lote = m2Lote ?? parseM2(text)
      } else {
        m2Unknown = m2Unknown ?? parseM2(text)
      }
    }
    // "356 un." = unidades de desarrollo → ignorar
  }

  // Resolución:
  //   - "construido" siempre gana como m2Constructed
  //   - Si NO hay construido y hay "lote" o "sin etiqueta" → tomarlo como m2Constructed
  //     (Inmuebles24 etiqueta "lote" a la superficie del depto en muchos casos)
  //   - Si HAY construido y también "lote" → "lote" va a m2Total (terreno legítimo)
  const m2Constructed = m2Construct ?? m2Lote ?? m2Unknown
  const m2Total = m2Construct != null ? m2Lote : null

  return { bedrooms, bathrooms, m2Constructed, m2Total, parkingSpaces }
}

// ── Page extractor ─────────────────────────────────────────────────────────────

async function extractListingsFromPage(
  page: Page,
  zone: ZoneConfig
): Promise<RawListing[]> {
  const cards = await page.locator(SELECTORS.listingCard).all()
  const listings: RawListing[] = []

  for (const card of cards) {
    try {
      // sourceId y URL vienen directo de atributos del card
      const sourceId = await card.getAttribute("data-id").catch(() => null)
      const toPosting = await card.getAttribute("data-to-posting").catch(() => null)
      const postingTypeRaw = await card.getAttribute("data-posting-type").catch(() => "OTHER")

      if (!sourceId || !toPosting) continue

      const sourceUrl = toPosting.startsWith("http")
        ? toPosting
        : `https://www.inmuebles24.com${toPosting}`

      const postingType: RawListing["postingType"] =
        postingTypeRaw === "DEVELOPMENT" ? "DEVELOPMENT"
        : postingTypeRaw === "PROPERTY"  ? "RESULT"
        : "OTHER"

      // Ubicación — para filtrar anuncios de otras ciudades
      const locationEl = card.locator(SELECTORS.location).first()
      const locationText = (await locationEl.textContent().catch(() => "") ?? "").trim()

      // DEBUG: mostrar location de todos los cards
      if (process.env.DEBUG_SCRAPER) {
        console.log(`    [DEBUG] id=${sourceId} location="${locationText}"`)
      }

      // Filtrar: si la location no coincide con la zona, descartar
      if (locationText) {
        const matchesZone = zone.locationKeywords.some((kw) =>
          locationText.toLowerCase().includes(kw.toLowerCase())
        )
        if (!matchesZone) continue
      }

      // Título — el enlace dentro del h2 de descripción
      const titleEl = card.locator(SELECTORS.titleLink).first()
      const title = (await titleEl.textContent().catch(() => "") ?? "").trim().slice(0, 300)

      // Precio
      const priceEl = card.locator(SELECTORS.price).first()
      const priceRaw = (await priceEl.textContent().catch(() => "") ?? "").trim()
      const price = parsePrice(priceRaw)

      // Features
      const featureTexts = await card.locator(SELECTORS.featureSpans).allTextContents()
      const features = parseFeatures(featureTexts)

      // Fallback: extraer m² del título — solo si features no tenía m²
      // Usa parseM2 (toma parte entera, ignora decimales rotos) y exige ≥ 30.
      if (features.m2Constructed === null && title) {
        const n = parseM2(title)
        if (n != null && n >= 30) features.m2Constructed = n
      }

      // Amenidades
      const amenityTexts = await card.locator(SELECTORS.amenities).allTextContents()
      const amenities = amenityTexts.map((a) => a.trim()).filter(Boolean)

      // Imagen principal
      const imgEl = card.locator(SELECTORS.image).first()
      const imgSrc = await imgEl.getAttribute("src").catch(() => null)
      const images = imgSrc ? [imgSrc] : []

      // Desarrollo detectado desde el título o location
      const desarrolloText = `${title} ${locationText}`
      const desarrollo = detectDesarrollo(desarrolloText, zone.desarrolloKeywords)

      listings.push({
        sourceId,
        sourceUrl,
        title,
        zona: zone.name,
        desarrollo,
        price,
        ...features,
        images,
        amenities,
        postingType,
      })
    } catch (err) {
      console.warn("  ⚠ Error extrayendo tarjeta:", (err as Error).message)
    }
  }

  return listings
}

// ── Zone scraper ───────────────────────────────────────────────────────────────

// Lanza un contexto de navegador fresco para una sola página de resultados.
// Usar un contexto nuevo por página evita que Cloudflare detecte la sesión
// como bot después de la primera solicitud.
async function scrapeOnePage(
  browser: import("playwright").Browser,
  url: string,
  zone: ZoneConfig
): Promise<{ listings: RawListing[]; hasNext: boolean }> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
  })

  try {
    const page = await context.newPage()

    await page.route("**/*.{woff,woff2,ttf,mp4,mp3}", (route) => route.abort())
    await page.route("**/googletagmanager*", (route) => route.abort())
    await page.route("**/facebook.com/tr*", (route) => route.abort())

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })

    const hasCards = await page
      .waitForSelector(SELECTORS.listingCard, { timeout: 25_000 })
      .then(() => true)
      .catch(() => false)

    if (!hasCards) return { listings: [], hasNext: false }

    const listings = await extractListingsFromPage(page, zone)

    const hasNext = await page
      .locator(SELECTORS.nextPage).isVisible({ timeout: 2_000 })
      .catch(() => false)

    return { listings, hasNext }
  } finally {
    await context.close()
  }
}

export async function scrapeZone(zone: ZoneConfig): Promise<RawListing[]> {
  console.log(`\n🔍 Scrapeando zona: ${zone.name}`)
  console.log(`   URL: ${zone.searchUrl}`)

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })

  const allListings: RawListing[] = []

  try {
    const baseUrl = zone.searchUrl.replace(/\.html$/, "")
    const seenSourceIds = new Set<string>()
    let pageNum = 1

    while (pageNum <= MAX_PAGES) {
      const url = pageNum === 1 ? zone.searchUrl : `${baseUrl}-pagina-${pageNum}.html`
      console.log(`  📄 Página ${pageNum}...`)

      const { listings: pageListings, hasNext } = await scrapeOnePage(browser, url, zone)

      if (pageListings.length === 0) {
        console.log("  ⚠ Sin resultados — fin de paginación")
        break
      }

      const newListings = pageListings.filter((l) => !seenSourceIds.has(l.sourceId))
      for (const l of pageListings) seenSourceIds.add(l.sourceId)

      console.log(`     → ${newListings.length} nuevos de la zona (${pageListings.length} totales, ${pageListings.length - newListings.length} ya vistos)`)
      allListings.push(...newListings)

      if (pageListings.length > 0 && newListings.length === 0) {
        console.log("  ✅ Sin listings nuevos — fin de paginación")
        break
      }

      if (!hasNext) {
        console.log("  ✅ Última página")
        break
      }

      pageNum++
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS))
    }
  } finally {
    await browser.close()
  }

  console.log(`  ✅ Total zona ${zone.name}: ${allListings.length} listings`)
  return allListings
}
