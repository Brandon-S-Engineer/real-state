// ── Content script: Facebook Marketplace ─────────────────────────────────────
//
// Captura PASIVA: solo lee lo que tú abres/scrolleas. No hace scroll, no hace
// click, no navega. MutationObserver + debounce, igual que el de grupos.
//
//   - Grid de búsqueda: cada card MacBook → lote para el CRM (cuenta como
//     "sesión" de esa búsqueda, para detectar listings que desaparecen)
//   - Item abierto: descripción, condición, coords, vendedor → enriquece
//
// Selectores en mp-selectors.js · extracción en mp-extract.js

;(() => {
  if (window.__mpMacbookCatcher) return
  window.__mpMacbookCatcher = true

  const FLUSH_MS = 3000
  const MAX_BATCH = 40

  let enabled = true
  let negatives = []
  const sentCards = new Map() // externalId → firma (precio|título) ya enviada
  const sentItems = new Map() // externalId → firma del detalle ya enviado
  let queue = [] // { kind: 'cards'|'item', sourceKey, sourceName, listing }
  let lastSearch = null // { key, name } — la búsqueda "de fondo" cuando abres un item en diálogo
  const stats = { seen: 0, sent: 0, created: 0, skipped: 0, lastError: null, lastSentAt: null }

  function log(...args) {
    console.log('%c[MacBook Catcher]', 'color:#0ea5e9;font-weight:600', ...args)
  }

  function normalize(s) {
    return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  }

  // ── Fuente actual ───────────────────────────────────────────────────────────

  function currentSearch() {
    const u = new URL(location.href)
    if (/\/marketplace\/item\//.test(u.pathname)) return null
    const q = u.searchParams.get('query')
    if (q) return { key: `mp:${normalize(q).trim()}`, name: `Marketplace: "${q}"` }
    const path = u.pathname.replace(/\/+$/, '')
    return { key: `mp:${path}`, name: `Marketplace: ${path.replace('/marketplace', '') || 'inicio'}` }
  }

  function isItemUrl() {
    return /\/marketplace\/item\/\d+/.test(location.pathname)
  }

  // ── Escaneo ─────────────────────────────────────────────────────────────────

  function isRelevant(title) {
    if (!window.MP_CONFIG.titleMustMatch.test(title)) return false
    const t = normalize(title)
    return !negatives.some((n) => n && t.includes(normalize(n)))
  }

  function markCard(el) {
    if (el.dataset.mpCaptured) return
    el.dataset.mpCaptured = '1'
    el.style.outline = '2px solid rgba(14,165,233,0.55)'
    el.style.outlineOffset = '-2px'
    el.style.borderRadius = '8px'
  }

  function onMarketplace() {
    return location.pathname.startsWith('/marketplace')
  }

  function scan() {
    if (statusEl) statusEl.style.display = onMarketplace() ? '' : 'none'
    if (!enabled || !onMarketplace()) return
    const search = currentSearch()
    if (search) lastSearch = search
    const source = search ?? lastSearch

    // Cards del grid (si estamos en un item directo sin búsqueda de fondo, no hay grid útil)
    if (source) {
      for (const { card, el } of window.MPExtract.extractCards(document)) {
        if (!isRelevant(card.title)) continue
        const sig = `${card.price}|${card.title}|${card.originalPrice}`
        markCard(el)
        if (sentCards.get(card.externalId) === sig) continue
        sentCards.set(card.externalId, sig)
        stats.seen++
        const { _parsedFrom, ...listing } = card
        queue.push({ kind: 'cards', sourceKey: source.key, sourceName: source.name, listing })
      }
    }

    // Item abierto
    if (isItemUrl()) {
      const { item, error } = window.MPExtract.extractItem(document, location.href)
      if (item && isRelevant(item.title)) {
        // Esperar a que cargue la descripción antes de mandar (FB la pinta después)
        const sig = `${item.price}|${item.description?.length ?? 0}|${item.lat}|${item.soldHint}`
        if (sentItems.get(item.externalId) !== sig) {
          sentItems.set(item.externalId, sig)
          queue.push({ kind: 'item', sourceKey: 'mp:item', sourceName: 'Marketplace: detalle', listing: item })
        }
      } else if (error && error !== 'no-root') {
        log('item no extraído:', error)
      }
    }

    if (queue.length >= MAX_BATCH) flush()
    renderStatus()
  }

  // ── Envío (vía service worker, que tiene la API key) ────────────────────────

  let flushTimer = null
  function scheduleFlush() {
    clearTimeout(flushTimer)
    flushTimer = setTimeout(flush, FLUSH_MS)
  }

  async function flush() {
    if (!queue.length) return
    const batch = queue
    queue = []

    // Agrupar por (kind, sourceKey)
    const groups = new Map()
    for (const q of batch) {
      const k = `${q.kind}::${q.sourceKey}`
      if (!groups.has(k)) groups.set(k, { kind: q.kind, sourceKey: q.sourceKey, sourceName: q.sourceName, listings: [] })
      groups.get(k).listings.push(q.listing)
    }

    for (const g of groups.values()) {
      const payload = {
        source: 'MARKETPLACE',
        sourceKey: g.sourceKey,
        sourceName: g.sourceName,
        countsAsSession: g.kind === 'cards',
        listings: g.listings,
      }
      try {
        const res = await chrome.runtime.sendMessage({ type: 'ELEC_INGEST', payload })
        if (!res?.ok) throw new Error(res?.error ?? 'sin respuesta')
        stats.sent += g.listings.length
        stats.created += res.data?.created ?? 0
        stats.skipped += res.data?.skipped ?? 0
        stats.lastError = null
        stats.lastSentAt = new Date()
        log(`✓ ${g.listings.length} enviados (${g.sourceKey})`, res.data)
      } catch (err) {
        stats.lastError = err.message
        // Permitir reintento en el próximo scan
        for (const l of g.listings) { sentCards.delete(l.externalId); sentItems.delete(l.externalId) }
        log('✗ error enviando:', err.message)
      }
    }
    renderStatus()
  }

  // ── Indicador ───────────────────────────────────────────────────────────────

  let statusEl = null
  function renderStatus() {
    if (!onMarketplace()) return
    if (!statusEl) {
      statusEl = document.createElement('div')
      statusEl.style.cssText = `position:fixed;bottom:16px;right:16px;z-index:99999;background:rgba(17,24,39,.92);color:#fff;
        font:11px/1.4 system-ui,-apple-system,sans-serif;padding:6px 10px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);
        max-width:260px;pointer-events:none`
      document.body.appendChild(statusEl)
    }
    const src = currentSearch() ?? lastSearch
    statusEl.innerHTML = `<strong>💻 MacBook Catcher${enabled ? '' : ' (pausado)'}</strong><br>
      ${src ? `${escapeHtml(src.name)}<br>` : ''}
      Vistos ${stats.seen} · enviados ${stats.sent} · nuevos ${stats.created}
      ${queue.length ? ` · en cola ${queue.length}` : ''}
      ${stats.lastError ? `<br><span style="color:#fca5a5">⚠ ${escapeHtml(stats.lastError)}</span>` : ''}`
  }

  function escapeHtml(s) {
    const d = document.createElement('div')
    d.textContent = s
    return d.innerHTML
  }

  // ── Observer + mensajes ─────────────────────────────────────────────────────

  let scanTimer = null
  function scheduleScan() {
    clearTimeout(scanTimer)
    scanTimer = setTimeout(() => { scan(); scheduleFlush() }, 400)
  }

  // La recarga periódica la programa el service worker (chrome.alarms), no
  // este script: así sigue funcionando aunque la pestaña esté en segundo plano
  // o Chrome la haya suspendido. Este listener solo atiende la orden y manda
  // lo que tenga en cola antes de recargar.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'MP_DUMP_LAYOUT') {
      sendResponse({ ok: true, html: window.MPExtract.dumpLayout(document), url: location.href })
      return false
    }
    if (msg.type === 'MP_STATS') {
      sendResponse({ ok: true, stats: { ...stats, queued: queue.length }, source: currentSearch() ?? lastSearch })
      return false
    }
    if (msg.type === 'MP_FORCE_RELOAD') {
      if (isItemUrl()) { sendResponse({ ok: false, reason: 'item' }); return false }
      ;(async () => { if (queue.length) await flush(); sendResponse({ ok: true }); location.reload() })()
      return true
    }
    return false
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.mpEnabled) { enabled = changes.mpEnabled.newValue !== false; renderStatus() }
    if (changes.keywords) negatives = changes.keywords.newValue?.negative ?? []
  })

  async function init() {
    const data = await chrome.storage.local.get(['mpEnabled', 'keywords'])
    enabled = data.mpEnabled !== false
    negatives = data.keywords?.negative ?? []
    log('activo en', location.href)
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true })
    scheduleScan()
    // FB es SPA: la URL cambia sin recargar (abrir/cerrar item, nueva búsqueda)
    let lastHref = location.href
    setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; scheduleScan() } }, 1000)
    window.addEventListener('beforeunload', () => { if (queue.length) flush() })
  }

  init()
})()
