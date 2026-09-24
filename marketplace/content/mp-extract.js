// ── Extracción pura de Marketplace (sin side effects) ────────────────────────
//
// Funciones que reciben un nodo DOM y devuelven datos. No tocan chrome.*, ni
// mandan nada: así se pueden probar contra los fixtures con jsdom
// (scripts/test-mp-selectors.ts). Dependen de window.MP_CONFIG.

;(() => {
  const C = () => window.MP_CONFIG

  function text(el) {
    return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
  }

  function moneyToNumber(s) {
    if (!s) return null
    if (/free|gratis/i.test(s)) return 0
    const n = Number(String(s).replace(/[^\d]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }

  // "2 weeks", "a week", "3 days", "an hour", "3 días", "una semana", "2 h"
  function relativeToMs(s) {
    if (!s) return null
    const t = s.toLowerCase().trim()
    if (/just now|ahora|justo ahora|moments?/.test(t)) return 0
    const m = t.match(/(\d+|a|an|un|una|uno)\s*(second|sec|segundo|minute|min|minuto|hour|hora|h\b|day|día|dia|d\b|week|semana|month|mes|year|año|ano)/)
    if (!m) return null
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1
    const unit = m[2]
    const mult =
      /^(second|sec|segundo)/.test(unit) ? 1000 :
      /^(minute|min|minuto)/.test(unit) ? 60_000 :
      /^(hour|hora|h)/.test(unit) ? 3_600_000 :
      /^(day|día|dia|d)/.test(unit) ? 86_400_000 :
      /^(week|semana)/.test(unit) ? 604_800_000 :
      /^(month|mes)/.test(unit) ? 2_592_000_000 :
      31_536_000_000
    return n * mult
  }

  function cleanImageUrl(src) {
    return src && /^https?:/.test(src) ? src : null
  }

  // ── Cards de resultados ─────────────────────────────────────────────────────

  /** Parsea el aria-label de un card. null si no encaja con el formato. */
  function parseCardAriaLabel(label) {
    const m = label?.match(C().card.ariaLabel)
    if (!m) return null
    return {
      title: m[1].trim(),
      price: moneyToNumber(m[2]),
      originalPrice: moneyToNumber(m[3]),
      locationText: m[4].trim(),
      id: m[5],
    }
  }

  /** Plan B cuando el aria-label cambia de formato: líneas de innerText. */
  function parseCardText(link) {
    const lines = (link.innerText ?? link.textContent ?? '')
      .split('\n').map((l) => l.trim()).filter(Boolean)
      .filter((l) => !C().card.noiseLines.test(l))
    const prices = lines.filter((l) => /^MX\$/.test(l))
    const rest = lines.filter((l) => !/^MX\$/.test(l))
    if (!rest.length) return null
    return {
      title: rest[0],
      price: moneyToNumber(prices[0]),
      originalPrice: moneyToNumber(prices[1]),
      locationText: rest.length > 1 ? rest[rest.length - 1] : null,
    }
  }

  function extractCard(link) {
    const href = link.getAttribute('href') || ''
    const idMatch = href.match(C().card.itemId)
    if (!idMatch) return null
    const id = idMatch[1]
    const fromAria = parseCardAriaLabel(link.getAttribute('aria-label'))
    const data = fromAria ?? parseCardText(link)
    if (!data?.title) return null
    const img = link.querySelector(C().card.image)
    return {
      externalId: `mp_${id}`,
      url: `https://www.facebook.com/marketplace/item/${id}/`,
      title: data.title,
      price: data.price ?? null,
      originalPrice: data.originalPrice && data.originalPrice !== data.price ? data.originalPrice : null,
      locationText: data.locationText ?? null,
      imageUrl: cleanImageUrl(img?.getAttribute('src')),
      _parsedFrom: fromAria ? 'aria' : 'text',
    }
  }

  function extractCards(root) {
    const out = []
    const seen = new Set()
    for (const link of root.querySelectorAll(C().card.link)) {
      const card = extractCard(link)
      if (!card || seen.has(card.externalId)) continue
      seen.add(card.externalId)
      out.push({ card, el: link })
    }
    return out
  }

  // ── Item abierto ────────────────────────────────────────────────────────────

  function findItemRoot(doc) {
    for (const sel of C().item.roots) {
      const el = doc.querySelector(sel)
      if (el && el.querySelector(C().item.title)) return el
    }
    return null
  }

  function extractItem(doc, locationHref) {
    const cfg = C().item
    const root = findItemRoot(doc)
    if (!root) return { error: 'no-root' }

    let id = (locationHref || '').match(C().card.itemId)?.[1] ?? null
    if (!id) {
      const a = root.querySelector(cfg.productIdLink)
      id = a?.getAttribute('href')?.match(cfg.productIdParam)?.[1] ?? null
    }
    if (!id) return { error: 'no-id' }

    const title = text(root.querySelector(cfg.title))
    if (!title) return { error: 'no-title' }

    const spans = Array.from(root.querySelectorAll('span[dir="auto"]'))
    const priceSpan = spans.find((s) => cfg.priceText.test(text(s)))
    const priceLine = text(priceSpan)
    const moneys = priceLine.match(/MX\$\s?[\d,]+/g) ?? []
    const price = moneyToNumber(moneys[0])
    const originalPrice = moneys[1] ? moneyToNumber(moneys[1]) : null

    // "Listed …" (el span interno trae el texto completo, el externo repite)
    let locationText = null
    let postedText = null
    const listedSpan = spans.find((s) => cfg.listedText.test(text(s)))
    const listed = text(listedSpan)
    let m
    if ((m = listed.match(cfg.listedAgoIn))) { postedText = m[1]; locationText = m[2] }
    else if ((m = listed.match(cfg.publicadoHaceEn))) { postedText = m[1]; locationText = m[2] }
    else if ((m = listed.match(cfg.listedIn))) { locationText = m[1] }
    else if ((m = listed.match(cfg.publicadoEn))) { locationText = m[1] }
    const agoMs = relativeToMs(postedText)

    let condition = null
    for (const row of root.querySelectorAll(cfg.detailRow)) {
      const parts = Array.from(row.querySelectorAll('span[dir="auto"]')).map(text).filter(Boolean)
      if (parts.length >= 2 && cfg.conditionLabel.test(parts[0])) { condition = parts[parts.length - 1]; break }
    }

    let description = null
    for (const el of root.querySelectorAll(cfg.descriptionCandidates)) {
      if (el.closest(cfg.ignoreWithin)) continue
      const t = text(el).replace(cfg.seeMore, '')
      if (!t || t === title || cfg.priceText.test(t) || cfg.listedText.test(t)) continue
      if (!description || t.length > description.length) description = t
    }

    let lat = null
    let lng = null
    const map = root.querySelector(cfg.map)
    const mc = (map?.getAttribute('style') ?? '').match(cfg.mapCenter)
    if (mc) { lat = Number(mc[1]); lng = Number(mc[2]) }

    const sellerA = root.querySelector(cfg.seller)
    const sellerName = sellerA?.getAttribute('aria-label') ?? null
    const sellerId = sellerA?.getAttribute('href')?.match(cfg.sellerId)?.[1] ?? null

    const photo = root.querySelector(cfg.photos) ?? root.querySelector(cfg.photoFallback)

    const rootText = text(root).slice(0, 5000)
    const soldHint = cfg.soldText.test(priceLine) || cfg.unavailableText.test(rootText)

    return {
      item: {
        externalId: `mp_${id}`,
        url: `https://www.facebook.com/marketplace/item/${id}/`,
        title,
        description,
        condition,
        price,
        originalPrice: originalPrice && originalPrice !== price ? originalPrice : null,
        locationText,
        lat, lng,
        sellerName, sellerId,
        imageUrl: cleanImageUrl(photo?.getAttribute('src')),
        postedText,
        postedAt: agoMs != null ? Date.now() - agoMs : null,
        soldHint,
      },
    }
  }

  // ── Layout para debug ───────────────────────────────────────────────────────

  /** HTML sin clases/estilos/svg — para pegar en fixtures cuando FB cambie. */
  function dumpLayout(doc) {
    const root = findItemRoot(doc) ?? doc.querySelector('[role="main"]') ?? doc.body
    const clone = root.cloneNode(true)
    clone.querySelectorAll('svg, script, style, noscript, video, i[data-visualcompletion="css-img"]').forEach((n) => n.remove())
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      for (const attr of Array.from(el.attributes)) {
        const keep =
          attr.name.startsWith('aria-') || ['role', 'href', 'alt', 'src', 'dir', 'justify', 'id'].includes(attr.name) ||
          (attr.name === 'style' && /static_map/.test(attr.value))
        if (!keep) el.removeAttribute(attr.name)
        else if ((attr.name === 'src' || attr.name === 'href') && attr.value.length > 200) el.setAttribute(attr.name, attr.value.slice(0, 200) + '…')
      }
    }
    return `<!-- ${location.href} · ${new Date().toISOString()} -->\n` + clone.outerHTML.replace(/<div>\s*<\/div>/g, '').replace(/\n\s*\n/g, '\n')
  }

  window.MPExtract = { parseCardAriaLabel, parseCardText, extractCard, extractCards, extractItem, findItemRoot, relativeToMs, dumpLayout }
})()
