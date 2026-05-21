import { getAlerts, getGroups, getTemplates, getSettings } from '../shared/storage.js'
import { composeMessage } from '../shared/templates.js'
import { getAuthors, postsInLastDays, groupsCount, groupsList } from '../shared/authors.js'

// ── Estado local del popup ────────────────────────────────────────────────────

let allAlerts = []
let allGroups = []
let allAuthors = {}
let templates = null
let settings = null
let currentFilter = 'all'   // all | new | viewed | contacted | saved | dismissed
const expandedAlerts = new Set()
const editedMessages = new Map()  // alertId → texto editado
const sendingToCrm = new Set()    // alertIds actualmente enviándose

// ── Utils ────────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id) }

function relativeTime(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}min`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86400)}d`
}

function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag)
  if (opts.className) node.className = opts.className
  if (opts.text) node.textContent = opts.text
  if (opts.html) node.innerHTML = opts.html
  if (opts.title) node.title = opts.title
  if (opts.onClick) node.addEventListener('click', opts.onClick)
  for (const child of children) {
    if (child) node.appendChild(child)
  }
  return node
}

async function patchAlert(alertId, patch) {
  return chrome.runtime.sendMessage({ type: 'UPDATE_ALERT', alertId, patch })
}

// ── Render: grupos ───────────────────────────────────────────────────────────

function renderGroups() {
  const list = $('groups-list')
  list.innerHTML = ''
  $('groups-count').textContent = `${allGroups.filter((g) => g.enabled).length} activos`

  if (allGroups.length === 0) {
    $('groups-empty').classList.remove('hidden')
    return
  }
  $('groups-empty').classList.add('hidden')

  for (const g of allGroups) {
    const item = el('li', {
      className: 'group-item',
      title: 'Click para abrir',
      onClick: () => {
        chrome.tabs.create({ url: g.url })
        window.close()
      },
    }, [
      el('span', { className: 'group-name', text: g.name }),
      el('span', { className: 'group-stats' }, [
        el('span', { className: `dot ${g.enabled ? '' : 'disabled'}` }),
        el('span', { text: `${g.alertCount ?? 0} alertas` }),
      ]),
    ])
    list.appendChild(item)
  }
}

// ── Render: filtros + alertas ────────────────────────────────────────────────

function countsByState() {
  const counts = { all: allAlerts.length, new: 0, viewed: 0, contacted: 0, saved: 0, dismissed: 0 }
  for (const a of allAlerts) {
    counts[a.state] = (counts[a.state] ?? 0) + 1
  }
  return counts
}

function updateFilterCounts() {
  const counts = countsByState()
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    const filter = chip.dataset.filter
    const countEl = chip.querySelector('.count')
    if (countEl) countEl.textContent = counts[filter] ?? 0
  })
}

function filteredAlerts() {
  if (currentFilter === 'all') return allAlerts
  return allAlerts.filter((a) => a.state === currentFilter)
}

function renderAlerts() {
  const list = $('alerts-list')
  list.innerHTML = ''
  updateFilterCounts()

  const list_ = filteredAlerts()
  if (list_.length === 0) {
    $('alerts-empty').classList.remove('hidden')
    return
  }
  $('alerts-empty').classList.add('hidden')

  for (const a of list_.slice(0, 80)) {
    list.appendChild(renderAlertItem(a))
  }
}

function renderAlertItem(a) {
  const li = el('li', { className: `alert-item state-${a.state}` })

  // Header — usar postedAt (cuando se publicó realmente) si lo tenemos,
  // si no, detectedAt (cuando lo capturamos)
  const timeRef = a.postedAt ?? a.detectedAt
  li.appendChild(el('div', { className: 'alert-header' }, [
    el('span', { className: 'alert-author', text: a.author }),
    el('span', {
      className: 'alert-time',
      text: relativeTime(timeRef),
      title: a.postedAt
        ? `Publicado hace ${relativeTime(a.postedAt)} · Capturado hace ${relativeTime(a.detectedAt)}`
        : `Capturado hace ${relativeTime(a.detectedAt)} (sin fecha de publicación)`,
    }),
  ]))
  li.appendChild(el('div', { className: 'alert-group', text: a.groupName }))

  // Author meta (cross-group, post count, agent flag)
  const authorMeta = renderAuthorMeta(a)
  if (authorMeta) li.appendChild(authorMeta)

  // Texto del post (click abre Facebook)
  const textEl = el('div', {
    className: 'alert-text',
    text: a.text,
    title: 'Click para abrir el post en Facebook',
    onClick: () => {
      const url = a.permalink || `https://www.facebook.com/groups/${encodeURIComponent(a.groupName)}`
      chrome.tabs.create({ url })
      if (a.state === 'new') patchAlert(a.id, { state: 'viewed' })
    },
  })
  li.appendChild(textEl)

  // Heat indicator (comments, reactions, freshness)
  const heatBits = []
  if (a.commentsCount != null) heatBits.push({ icon: '💬', value: a.commentsCount, label: 'comentarios' })
  if (a.reactionsCount != null) heatBits.push({ icon: '❤', value: a.reactionsCount, label: 'reacciones' })
  if (heatBits.length > 0) {
    const heat = el('div', { className: 'alert-heat' })
    for (const bit of heatBits) {
      heat.appendChild(el('span', {
        className: 'heat-item',
        title: bit.label,
        html: `<span class="heat-icon">${bit.icon}</span> <span class="heat-value">${bit.value}</span>`,
      }))
    }
    // Hot/cold indicator — usa postedAt si lo tenemos (fecha real del post)
    const total = (a.commentsCount ?? 0) + (a.reactionsCount ?? 0)
    const ageRef = a.postedAt ?? a.detectedAt
    const ageHr = (Date.now() - ageRef) / 3_600_000

    if (ageHr < 3 && total >= 5) {
      // Mucho engagement en poco tiempo → competencia, actúa ya
      heat.appendChild(el('span', {
        className: 'heat-badge hot',
        text: '🔥 caliente',
        title: `${total} reacciones/comentarios en ${ageHr.toFixed(1)}h — hay competencia, actúa rápido`,
      }))
    } else if (ageHr < 1 && total <= 1) {
      // Recién posteado, sin engagement → eres de los primeros
      heat.appendChild(el('span', {
        className: 'heat-badge fresh',
        text: '✨ fresco',
        title: `Publicado hace ${ageHr < 0.5 ? '<30min' : '<1h'} sin engagement — entra de los primeros`,
      }))
    }
    li.appendChild(heat)
  }

  // Keywords matched
  if (a.matches?.length) {
    const matchesEl = el('div', { className: 'alert-matches' })
    for (const m of a.matches.slice(0, 5)) {
      matchesEl.appendChild(el('span', { className: 'match-chip', text: m }))
    }
    li.appendChild(matchesEl)
  }

  // Action buttons row
  const actions = el('div', { className: 'alert-actions' })

  // Mensaje (genera template)
  actions.appendChild(el('button', {
    className: 'action-btn',
    text: expandedAlerts.has(a.id) ? '💬 Ocultar' : '💬 Mensaje',
    onClick: (e) => {
      e.stopPropagation()
      if (expandedAlerts.has(a.id)) expandedAlerts.delete(a.id)
      else expandedAlerts.add(a.id)
      renderAlerts()
    },
  }))

  // CRM button (mandar lead al CRM o abrir si ya fue enviado)
  actions.appendChild(renderCrmButton(a))

  // Contactado / Revertir
  if (a.state !== 'contacted') {
    actions.appendChild(el('button', {
      className: 'action-btn',
      text: '✅ Contactado',
      title: 'Marcar como contactado',
      onClick: async (e) => {
        e.stopPropagation()
        await patchAlert(a.id, { state: 'contacted' })
      },
    }))
  } else {
    actions.appendChild(el('button', {
      className: 'action-btn',
      text: '↺ Revertir',
      title: 'Volver a vista',
      onClick: async (e) => {
        e.stopPropagation()
        await patchAlert(a.id, { state: 'viewed' })
      },
    }))
  }

  // Descartar
  if (a.state !== 'dismissed') {
    actions.appendChild(el('button', {
      className: 'action-btn danger',
      text: '🗑',
      title: 'Descartar',
      onClick: async (e) => {
        e.stopPropagation()
        await patchAlert(a.id, { state: 'dismissed' })
      },
    }))
  }

  // Marcar autor como agente (solo si tenemos authorId)
  if (a.authorId) {
    const author = allAuthors[a.authorId]
    const isAgent = !!author?.markedAsAgent
    actions.appendChild(el('button', {
      className: 'action-btn ' + (isAgent ? 'agent-on' : ''),
      text: isAgent ? '🚫 Es agente' : '🚫 Agente',
      title: isAgent
        ? `${a.author} está marcado como agente. Click para desmarcar.`
        : `Marcar a ${a.author} como agente. Sus futuros posts se auto-descartan.`,
      onClick: async (e) => {
        e.stopPropagation()
        if (!isAgent) {
          if (!confirm(`Marcar a "${a.author}" como agente conocido?\n\nSus posts futuros se auto-descartarán (no contaminarán tu feed). Los actuales se mantienen.`)) return
        }
        await chrome.runtime.sendMessage({
          type: 'MARK_AGENT',
          authorId: a.authorId,
          marked: !isAgent,
        })
      },
    }))
  }

  li.appendChild(actions)

  // Message panel expandido
  if (expandedAlerts.has(a.id)) {
    li.appendChild(renderMessagePanel(a))
  }

  return li
}

// ── Author meta row ──────────────────────────────────────────────────────────

function renderAuthorMeta(a) {
  if (!a.authorId) return null
  const author = allAuthors[a.authorId]
  if (!author) return null

  const bits = []
  const last30 = postsInLastDays(author, 30)
  const grps = groupsCount(author)
  const otherGroups = grps - (author.posts.some((p) => p.groupId === a.groupId) ? 1 : 0)

  if (last30 >= 3) {
    bits.push({
      cls: 'meta-pill meta-frequent',
      text: `📊 ${last30} posts en 30d`,
      title: `Este autor ha posteado ${last30} veces en tus grupos en los últimos 30 días. Considera marcarlo como agente si es repetitivo.`,
    })
  }
  if (otherGroups >= 1) {
    const otherGroupNames = groupsList(author)
      .filter((g) => g.id !== a.groupId)
      .map((g) => g.name)
      .join(', ')
    bits.push({
      cls: 'meta-pill meta-crossgroup',
      text: `👥 También en ${otherGroups} ${otherGroups === 1 ? 'grupo' : 'grupos'}`,
      title: `Cross-group: este autor también posteó en: ${otherGroupNames}`,
    })
  }
  if (author.markedAsAgent) {
    bits.push({
      cls: 'meta-pill meta-agent',
      text: '🚫 Agente marcado',
      title: 'Marcado como agente conocido. Sus futuros posts se auto-descartan.',
    })
  }

  if (bits.length === 0) return null

  const row = el('div', { className: 'alert-author-meta' })
  for (const b of bits) {
    row.appendChild(el('span', { className: b.cls, text: b.text, title: b.title }))
  }
  return row
}

// ── CRM button ───────────────────────────────────────────────────────────────

function renderCrmButton(a) {
  const isSent = !!a.crmClienteUrl
  const isSending = sendingToCrm.has(a.id)
  const crmConfigured = !!(settings?.crmUrl && settings?.crmApiKey)

  if (isSent) {
    return el('button', {
      className: 'action-btn crm',
      text: '✓ Ver en CRM',
      title: 'Abrir cliente en el CRM',
      onClick: (e) => {
        e.stopPropagation()
        const fullUrl = `${settings.crmUrl.replace(/\/$/, '')}${a.crmClienteUrl}`
        chrome.tabs.create({ url: fullUrl })
      },
    })
  }

  return el('button', {
    className: `action-btn ${crmConfigured ? 'primary' : ''}`,
    text: isSending ? '... Enviando' : '→ CRM',
    title: crmConfigured
      ? 'Enviar como Cliente al CRM (etapa D, fuente Facebook)'
      : 'CRM no configurado — ve a opciones para configurar URL + API key',
    onClick: async (e) => {
      e.stopPropagation()
      if (!crmConfigured) {
        chrome.runtime.openOptionsPage()
        return
      }
      if (sendingToCrm.has(a.id)) return
      sendingToCrm.add(a.id)
      renderAlerts()
      const result = await chrome.runtime.sendMessage({ type: 'SEND_TO_CRM', alertId: a.id })
      sendingToCrm.delete(a.id)
      if (result?.ok) {
        // Abrir el cliente recién creado
        const fullUrl = `${settings.crmUrl.replace(/\/$/, '')}${result.url}`
        chrome.tabs.create({ url: fullUrl })
      } else {
        alert(`Error al enviar al CRM: ${result?.error ?? 'desconocido'}`)
      }
      renderAlerts()
    },
  })
}

// ── Message panel (template generator inline) ────────────────────────────────

function renderMessagePanel(alert) {
  const panel = el('div', { className: 'message-panel' })

  const initialMsg = editedMessages.get(alert.id) ?? composeMessage(templates, alert.author)

  const textarea = el('textarea', {})
  textarea.value = initialMsg
  textarea.addEventListener('input', () => {
    editedMessages.set(alert.id, textarea.value)
  })

  const actions = el('div', { className: 'message-actions' })

  const regenBtn = el('button', {
    className: 'action-btn',
    text: '🔄 Otro',
    title: 'Regenerar mensaje (combinación random nueva)',
    onClick: () => {
      const fresh = composeMessage(templates, alert.author)
      textarea.value = fresh
      editedMessages.set(alert.id, fresh)
    },
  })
  actions.appendChild(regenBtn)

  let copied = false
  const copyBtn = el('button', {
    className: 'action-btn primary',
    text: '📋 Copiar',
    onClick: async () => {
      await navigator.clipboard.writeText(textarea.value)
      if (!copied) {
        const original = copyBtn.textContent
        copyBtn.textContent = '✓ Copiado'
        copied = true
        setTimeout(() => {
          copyBtn.textContent = original
          copied = false
        }, 1500)
      }
    },
  })
  actions.appendChild(copyBtn)

  panel.appendChild(textarea)
  panel.appendChild(actions)
  return panel
}

// ── Init y data refresh ──────────────────────────────────────────────────────

async function refresh() {
  ;[allGroups, allAlerts, templates, settings, allAuthors] = await Promise.all([
    getGroups(), getAlerts(), getTemplates(), getSettings(), getAuthors(),
  ])
  renderGroups()
  renderAlerts()
}

document.addEventListener('DOMContentLoaded', async () => {
  await refresh()

  // Marcar todas las 'new' como 'viewed' al abrir (limpia el badge)
  await chrome.runtime.sendMessage({ type: 'MARK_VIEWED' })

  // Filtros
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentFilter = chip.dataset.filter
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      renderAlerts()
    })
  })

  // Open options
  $('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage())
  $('open-options-link')?.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })

  // Limpiar descartadas: borra del storage las que están en estado dismissed
  $('clear-dismissed').addEventListener('click', async () => {
    if (!confirm('¿Borrar permanentemente las alertas descartadas?')) return
    const filtered = allAlerts.filter((a) => a.state !== 'dismissed')
    await chrome.storage.local.set({ alerts: filtered })
    await refresh()
  })

  // Live updates: si llegan alertas nuevas o cambian estados, re-render
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.alerts || changes.groups || changes.templates || changes.authors) refresh()
  })
})
