// ── Content script ───────────────────────────────────────────────────────────
//
// Inyectado en cada pestaña de facebook.com/groups/*. Detecta posts en el
// feed usando MutationObserver y los matchea contra keywords del usuario.
//
// Importante: NO automatiza nada (no scroll, no click). Solo lee el DOM
// mientras el usuario navega.

;(() => {
  if (window.__rsLeadCatcher) return
  window.__rsLeadCatcher = true

  let PROCESSED = new WeakSet()
  function resetProcessed() { PROCESSED = new WeakSet() }

  /** @type {object|null} */ let currentGroup = null
  /** @type {{positive: string[], negative: string[]}} */
  let keywords = { positive: [], negative: [] }

  // ── Utils ─────────────────────────────────────────────────────────────────

  function log(...args) {
    console.log('%c[RS Lead Catcher]', 'color: #22c55e; font-weight: 600', ...args)
  }

  function normalize(s) {
    return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  }

  function extractGroupSlug(href) {
    try {
      const u = new URL(href, location.origin)
      const m = u.pathname.match(/^\/groups\/([^/]+)/)
      return m ? m[1] : null
    } catch { return null }
  }

  function currentGroupSlug() {
    return extractGroupSlug(location.href)
  }

  function matchKeywords(text) {
    const norm = normalize(text)
    for (const neg of keywords.negative ?? []) {
      if (!neg.trim()) continue
      if (norm.includes(normalize(neg))) return { matched: false, matches: [], blockedBy: neg }
    }
    const matches = []
    for (const pos of keywords.positive ?? []) {
      if (!pos.trim()) continue
      if (norm.includes(normalize(pos))) matches.push(pos)
    }
    return { matched: matches.length > 0, matches, blockedBy: null }
  }

  // ── Detección de posts ────────────────────────────────────────────────────
  //
  // Estrategia robusta a obfuscación de clases de FB:
  //   1. Anclamos en [data-ad-rendering-role="story_message"] (cuerpo del post)
  //   2. Subimos hasta encontrar un [role="article"] o el hijo directo de [role="feed"]
  //   3. Ese es el contenedor del post

  function findPostContainers(root = document) {
    const containers = new Set()

    // Estrategia A: story_message (la más confiable cuando aplica)
    const messages = root.querySelectorAll('[data-ad-rendering-role="story_message"]')
    for (const msg of messages) {
      const container = walkUpToPostContainer(msg)
      if (container) containers.add(container)
    }

    // Estrategia B: [role="article"] (por si vuelve)
    root.querySelectorAll('[role="article"]').forEach((el) => containers.add(el))

    // Estrategia C: hijos directos del [role="feed"] con texto sustancial
    // Esto cubre el caso donde FB cambió el markup y no usa los anchors anteriores
    root.querySelectorAll('[role="feed"] > div').forEach((el) => {
      const text = el.innerText || ''
      if (text.length > 60 && !el.dataset.rsSkip) {
        containers.add(el)
      }
    })

    return Array.from(containers)
  }

  // ── Diagnóstico (corre cuando rescan encuentra 0 posts) ───────────────────

  let diagnosed = false
  function diagnose() {
    if (diagnosed) return
    diagnosed = true

    const counts = {
      feeds: document.querySelectorAll('[role="feed"]').length,
      feedDirectChildren: document.querySelectorAll('[role="feed"] > div').length,
      articles: document.querySelectorAll('[role="article"]').length,
      storyMessages: document.querySelectorAll('[data-ad-rendering-role="story_message"]').length,
    }
    log('⚙ DIAG counts:', counts)

    const roles = new Set()
    document.querySelectorAll('[data-ad-rendering-role]').forEach((e) =>
      roles.add(e.getAttribute('data-ad-rendering-role')),
    )
    if (roles.size) log('⚙ DIAG data-ad-rendering-role values present:', Array.from(roles))

    const firstChild = document.querySelector('[role="feed"] > div')
    if (firstChild) {
      log('⚙ DIAG first feed child class:', firstChild.className)
      log('⚙ DIAG first feed child innerText (first 200 chars):',
          firstChild.innerText?.slice(0, 200))
    } else {
      log('⚙ DIAG no [role="feed"] found yet — page may still be loading')
    }
  }

  function walkUpToPostContainer(el) {
    let cur = el
    let depth = 0
    while (cur && cur !== document.body && depth < 20) {
      if (cur.getAttribute?.('role') === 'article') return cur
      const parent = cur.parentElement
      if (parent?.getAttribute?.('role') === 'feed') return cur
      cur = parent
      depth++
    }
    // Fallback: el ancestro más cercano con suficiente contenido
    return el.closest('div')
  }

  // ── Extracción ────────────────────────────────────────────────────────────

  function isProfileLink(href) {
    if (!href || !href.startsWith('/')) return false
    if (href.startsWith('#')) return false
    if (href.includes('/posts/') || href.includes('/permalink/')) return false
    if (href.startsWith('/photo') || href.startsWith('/help') || href.startsWith('/login')) return false
    // Excluir el grupo en sí: /groups/X/ o /groups/X/media etc.
    if (/^\/groups\/[^/]+\/?$/.test(href)) return false
    if (/^\/groups\/[^/]+\/(media|members|events|files|topics|moderation|insights|admin)/.test(href)) return false
    // Aceptar: /username, /profile.php?id=, /groups/X/user/Y/, /people/Name/X/
    return true
  }

  function extractPost(container) {
    const msgEl = container.querySelector('[data-ad-rendering-role="story_message"]')
    const rawText = (msgEl?.innerText ?? container.innerText ?? '').trim()
    if (rawText.length < 15) {
      return { error: 'text-too-short', textLen: rawText.length }
    }

    // Autor: primer link de perfil dentro del contenedor
    const links = container.querySelectorAll('a[role="link"], a[href]')
    let author = null
    const candidateLinks = []
    for (const a of links) {
      const href = a.getAttribute('href') || ''
      const name = a.textContent?.trim() || ''
      if (!isProfileLink(href)) continue
      if (name.length < 2 || name.length > 80) continue
      if (/^\d+\s*(h|m|s|d|min|hora|día)/i.test(name)) continue  // timestamps "10h"
      candidateLinks.push({ name, href })
      if (!author) author = name
    }

    if (!author) {
      return { error: 'no-author', linksCount: links.length, candidates: candidateLinks }
    }

    // Permalink
    let permalink = null
    for (const a of links) {
      const href = a.getAttribute('href') || ''
      if (href.includes('/posts/') || href.includes('/permalink/')) {
        try {
          permalink = new URL(href, location.origin).href.split('?')[0]
        } catch {}
        break
      }
    }

    return { author, text: rawText.slice(0, 2000), permalink }
  }

  function generatePostId(post) {
    if (post.permalink) return post.permalink
    const key = `${post.author}::${post.text.slice(0, 80)}`
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
    }
    return `local-${Math.abs(hash).toString(36)}`
  }

  // ── Highlight visual ──────────────────────────────────────────────────────

  function highlightMatch(el, matches) {
    if (el.dataset.rsHighlighted) return
    el.dataset.rsHighlighted = '1'
    el.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.7)'
    el.style.borderRadius = '12px'
    el.style.transition = 'box-shadow 0.3s ease'

    const badge = document.createElement('div')
    badge.textContent = `🎯 ${matches.slice(0, 3).join(', ')}`
    badge.style.cssText = `
      position: absolute;
      top: -10px;
      left: 12px;
      background: #22c55e;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      pointer-events: none;
    `
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative'
    }
    el.appendChild(badge)
  }

  // ── Status indicator (esquina superior derecha) ───────────────────────────

  let statusEl = null
  let scanStats = { scanned: 0, matched: 0 }

  function ensureStatusIndicator() {
    if (statusEl) return
    statusEl = document.createElement('div')
    statusEl.id = 'rs-lead-catcher-status'
    statusEl.style.cssText = `
      position: fixed;
      top: 70px;
      right: 16px;
      background: rgba(17, 24, 39, 0.92);
      color: white;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 6px;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      cursor: pointer;
      user-select: none;
      max-width: 260px;
      line-height: 1.4;
    `
    statusEl.title = 'Click para colapsar/expandir'
    let collapsed = false
    statusEl.addEventListener('click', () => {
      collapsed = !collapsed
      statusEl.style.maxHeight = collapsed ? '20px' : 'none'
      statusEl.style.overflow = collapsed ? 'hidden' : 'visible'
    })
    document.body.appendChild(statusEl)
  }

  function updateStatus(msg) {
    if (!statusEl) return
    statusEl.innerHTML = msg
  }

  function renderStatus() {
    if (!currentGroup) {
      updateStatus(`<strong>RS Lead Catcher</strong><br>Grupo no configurado: <code>${currentGroupSlug() ?? '?'}</code>`)
      return
    }
    const rejected = Object.values(rejectStats).reduce((a, b) => a + b, 0)
    updateStatus(`
      <strong>📡 ${escapeHtml(currentGroup.name)}</strong><br>
      ${keywords.positive?.length ?? 0} keywords activas<br>
      Posts vistos: ${scanStats.scanned} · Matches: <strong style="color:#22c55e">${scanStats.matched}</strong>
      ${rejected > 0 ? `<br><span style="color:#fbbf24">⚠ ${rejected} rechazados (revisa consola)</span>` : ''}
    `)
  }

  function escapeHtml(s) {
    const div = document.createElement('div')
    div.textContent = s
    return div.innerHTML
  }

  // ── Procesamiento ─────────────────────────────────────────────────────────

  let rejectStats = { 'text-too-short': 0, 'no-author': 0 }
  let firstRejectLogged = false

  function processContainer(el) {
    if (PROCESSED.has(el)) return
    PROCESSED.add(el)

    if (!currentGroup || !currentGroup.enabled) return
    if (!keywords.positive?.length) return

    const post = extractPost(el)
    if (!post) return

    if (post.error) {
      rejectStats[post.error] = (rejectStats[post.error] ?? 0) + 1
      // Loguear el primer rechazo de cada tipo con detalle
      if (!firstRejectLogged) {
        firstRejectLogged = true
        log(`⚠ Primer post rechazado (${post.error}):`, post)
        log('   HTML snippet:', el.outerHTML.slice(0, 600))
      }
      renderStatus()
      return
    }

    scanStats.scanned++

    const { matched, matches, blockedBy } = matchKeywords(post.text)
    if (!matched) {
      if (blockedBy) log(`bloqueado por neg "${blockedBy}":`, post.author, post.text.slice(0, 60))
      renderStatus()
      return
    }

    scanStats.matched++
    log('✓ MATCH', { author: post.author, matches, text: post.text.slice(0, 80) })

    highlightMatch(el, matches)

    const alert = {
      id: generatePostId(post),
      groupId: currentGroup.id,
      groupName: currentGroup.name,
      author: post.author,
      text: post.text,
      permalink: post.permalink,
      detectedAt: Date.now(),
      type: 'POST',
      state: 'new',
      matches,
    }
    chrome.runtime.sendMessage({ type: 'NEW_ALERT', alert }).catch((err) => {
      log('Error enviando alerta al background:', err)
    })

    renderStatus()
  }

  function rescan() {
    const containers = findPostContainers(document)
    log(`rescan: ${containers.length} containers encontrados`)
    // Después de 4s, si no hemos visto NINGÚN post válido, diagnosticar
    setTimeout(() => {
      if (scanStats.scanned === 0 && scanStats.matched === 0) diagnose()
    }, 4000)
    containers.forEach(processContainer)
  }

  // ── Observer con debounce ─────────────────────────────────────────────────

  let rescanTimeout = null
  function scheduleRescan() {
    clearTimeout(rescanTimeout)
    rescanTimeout = setTimeout(rescan, 250)
  }

  function startObserving() {
    const observer = new MutationObserver(() => scheduleRescan())
    observer.observe(document.body, { childList: true, subtree: true })
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function loadConfig() {
    const data = await chrome.storage.local.get(['groups', 'keywords'])
    keywords = data.keywords ?? { positive: [], negative: [] }

    const slug = currentGroupSlug()
    if (!slug) {
      currentGroup = null
      return
    }
    const groups = data.groups ?? []
    currentGroup = groups.find(
      (g) => g.slug === slug || g.url.includes(slug) || slug.includes(g.slug ?? '__'),
    ) ?? null
  }

  async function init() {
    await loadConfig()
    ensureStatusIndicator()
    renderStatus()

    if (!currentGroup) {
      log('⚠ Grupo actual no está configurado en la extensión. Slug:', currentGroupSlug())
      return
    }
    log(`✓ Monitoreando "${currentGroup.name}" con ${keywords.positive?.length ?? 0} keywords`)

    rescan()
    startObserving()
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.keywords) {
      keywords = changes.keywords.newValue ?? keywords
      log('Keywords actualizadas, re-escaneando...')
      resetProcessed()
      // Limpiar highlights previos para no dejar verdes los que ya no aplican
      document.querySelectorAll('[data-rs-highlighted]').forEach((el) => {
        el.removeAttribute('data-rs-highlighted')
        el.style.boxShadow = ''
        el.querySelectorAll('div').forEach((d) => {
          if (d.textContent?.startsWith('🎯')) d.remove()
        })
      })
      scanStats = { scanned: 0, matched: 0 }
      rescan()
      renderStatus()
    }
    if (changes.groups) {
      loadConfig().then(() => {
        resetProcessed()
        renderStatus()
        rescan()
      })
    }
  })

  init()
})()
