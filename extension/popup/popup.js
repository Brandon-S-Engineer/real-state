import { getAlerts, getGroups, getTemplates } from '../shared/storage.js'
import { composeMessage } from '../shared/templates.js'

// ── Estado local del popup ────────────────────────────────────────────────────

let allAlerts = []
let allGroups = []
let templates = null
let currentFilter = 'all'   // all | new | viewed | contacted | dismissed
const expandedAlerts = new Set()
const editedMessages = new Map()  // alertId → texto editado

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

  // Header
  li.appendChild(el('div', { className: 'alert-header' }, [
    el('span', { className: 'alert-author', text: a.author }),
    el('span', { className: 'alert-time', text: relativeTime(a.detectedAt) }),
  ]))
  li.appendChild(el('div', { className: 'alert-group', text: a.groupName }))

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

  const msgBtn = el('button', {
    className: 'action-btn',
    text: expandedAlerts.has(a.id) ? '💬 Ocultar' : '💬 Mensaje',
    onClick: (e) => {
      e.stopPropagation()
      if (expandedAlerts.has(a.id)) {
        expandedAlerts.delete(a.id)
      } else {
        expandedAlerts.add(a.id)
      }
      renderAlerts()
    },
  })
  actions.appendChild(msgBtn)

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

  li.appendChild(actions)

  // Message panel expandido
  if (expandedAlerts.has(a.id)) {
    li.appendChild(renderMessagePanel(a))
  }

  return li
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
  ;[allGroups, allAlerts, templates] = await Promise.all([
    getGroups(), getAlerts(), getTemplates(),
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
    if (changes.alerts || changes.groups || changes.templates) refresh()
  })
})
