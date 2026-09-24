// ── Service worker ───────────────────────────────────────────────────────────
//
// Coordina alertas, dedupe, badge count, y reloads programados.

import { getAlerts, setAlerts, getGroups, setGroups, getSettings } from '../shared/storage.js'
import { recordAuthorPost, getAuthor, setMarkedAsAgent } from '../shared/authors.js'

const RELOAD_ALARM_PREFIX = 'reload-group-'

// ── Message handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'NEW_ALERT') {
    handleNewAlert(msg.alert).then((result) => sendResponse(result))
    return true
  }
  if (msg.type === 'MARK_VIEWED') {
    markViewed(msg.alertIds ?? null).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'UPDATE_ALERT') {
    updateAlert(msg.alertId, msg.patch).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'SEND_TO_CRM') {
    sendToCrm(msg.alertId).then((result) => sendResponse(result))
    return true
  }
  if (msg.type === 'MARK_AGENT') {
    setMarkedAsAgent(msg.authorId, msg.marked, msg.note).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'SYNC_RELOAD_ALARMS') {
    syncReloadAlarms().then(() => sendResponse({ ok: true }))
    return true
  }
  return false
})

// ── Alert handling ───────────────────────────────────────────────────────────

async function handleNewAlert(alert) {
  const alerts = await getAlerts()
  const existingIdx = alerts.findIndex((a) => a.id === alert.id)

  // Registrar al autor en el store (cross-group + stats)
  if (alert.authorId) {
    await recordAuthorPost(alert.authorId, alert.author, {
      alertId: alert.id,
      groupId: alert.groupId,
      groupName: alert.groupName,
      postedAt: alert.postedAt,
      detectedAt: alert.detectedAt,
      matchedKeywords: alert.matches ?? [],
    }).catch(() => {})
  }

  // Dedup: si ya existe, hacer MERGE en vez de descartar.
  if (existingIdx >= 0) {
    const existing = alerts[existingIdx]
    const merged = {
      ...existing,
      commentsCount: alert.commentsCount ?? existing.commentsCount,
      reactionsCount: alert.reactionsCount ?? existing.reactionsCount,
      matches: alert.matches?.length ? alert.matches : existing.matches,
      text: (alert.text?.length ?? 0) > (existing.text?.length ?? 0)
        ? alert.text
        : existing.text,
      permalink: existing.permalink ?? alert.permalink,
      postedAt: existing.postedAt ?? alert.postedAt,
      // authorId puede haber faltado en la primera detección
      authorId: existing.authorId ?? alert.authorId,
    }
    const updated = [...alerts]
    updated[existingIdx] = merged
    await setAlerts(updated)
    return { ok: true, merged: true }
  }

  // Auto-filtrar futuras alertas de autores marcados como agentes:
  // se guardan con state='dismissed' para no contaminar la vista por defecto.
  let initialState = alert.state ?? 'new'
  if (alert.authorId) {
    const author = await getAuthor(alert.authorId)
    if (author?.markedAsAgent) initialState = 'dismissed'
  }
  const alertToStore = { ...alert, state: initialState }

  // Alerta nueva: prepend + cap a 500
  const updated = [alertToStore, ...alerts].slice(0, 500)
  await setAlerts(updated)

  // Incrementar contador del grupo
  const groups = await getGroups()
  await setGroups(groups.map((g) =>
    g.id === alert.groupId
      ? { ...g, alertCount: (g.alertCount ?? 0) + 1 }
      : g
  ))

  await updateBadge()
  return { ok: true, deduped: false, autoDismissed: initialState === 'dismissed' }
}

async function markViewed(alertIds) {
  const alerts = await getAlerts()
  const target = alertIds ? new Set(alertIds) : null
  const updated = alerts.map((a) => {
    if (a.state !== 'new') return a
    if (target && !target.has(a.id)) return a
    return { ...a, state: 'viewed' }
  })
  await setAlerts(updated)
  await updateBadge()
}

async function updateAlert(alertId, patch) {
  const alerts = await getAlerts()
  const updated = alerts.map((a) => a.id === alertId ? { ...a, ...patch } : a)
  await setAlerts(updated)
  await updateBadge()
}

async function updateBadge() {
  const alerts = await getAlerts()
  const unread = alerts.filter((a) => a.state === 'new').length
  await chrome.action.setBadgeText({ text: unread > 0 ? String(unread) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

// ── Envío al CRM ─────────────────────────────────────────────────────────────

async function sendToCrm(alertId) {
  const settings = await getSettings()
  if (!settings.crmUrl || !settings.crmApiKey) {
    return { ok: false, error: 'CRM no configurado. Ve a opciones → Conexión al CRM.' }
  }

  const alerts = await getAlerts()
  const alert = alerts.find((a) => a.id === alertId)
  if (!alert) return { ok: false, error: 'Alerta no encontrada' }

  // Si ya fue enviada, no duplicar — devolver la URL existente
  if (alert.crmClienteUrl) {
    return { ok: true, alreadySent: true, url: alert.crmClienteUrl }
  }

  const url = `${settings.crmUrl.replace(/\/$/, '')}/api/clientes/inbox`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.crmApiKey}`,
      },
      body: JSON.stringify({
        autor: alert.author,
        textoPost: alert.text,
        grupo: alert.groupName,
        urlPost: alert.permalink ?? undefined,
        tipo: alert.type ?? 'POST',
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      if (res.status === 401) return { ok: false, error: 'API key inválida o expirada' }
      return { ok: false, error: `HTTP ${res.status}: ${errBody.slice(0, 100)}` }
    }

    const data = await res.json()
    // Persistir crmClienteId/url y marcar la alerta como saved
    await updateAlert(alertId, {
      state: 'saved',
      crmClienteId: data.id,
      crmClienteUrl: data.url,
    })

    return { ok: true, clienteId: data.id, url: data.url }
  } catch (err) {
    return { ok: false, error: `No se pudo conectar: ${err.message}` }
  }
}

// ── Reload alarms (cadencia programada por grupo) ────────────────────────────

async function syncReloadAlarms() {
  // Borrar todas las alarmas existentes
  const all = await chrome.alarms.getAll().catch(() => [])
  for (const a of all) {
    if (a.name.startsWith(RELOAD_ALARM_PREFIX)) {
      await chrome.alarms.clear(a.name).catch(() => {})
    }
  }

  const groups = await getGroups()
  const settings = await getSettings()

  for (const g of groups) {
    if (!g.enabled) continue
    const base = g.intervalMin || settings.reloadIntervalMin
    const jitter = settings.reloadJitterMin
    const minutes = base + (Math.random() * 2 - 1) * jitter
    chrome.alarms.create(`${RELOAD_ALARM_PREFIX}${g.id}`, {
      periodInMinutes: Math.max(2, minutes),
      delayInMinutes: Math.max(2, minutes),
    })
  }
}

chrome.alarms?.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(RELOAD_ALARM_PREFIX)) return
  const groupId = alarm.name.slice(RELOAD_ALARM_PREFIX.length)
  const groups = await getGroups()
  const group = groups.find((g) => g.id === groupId)
  if (!group || !group.enabled) return

  // Buscar tab abierto en este grupo y recargarlo
  const tabs = await chrome.tabs.query({ url: 'https://*.facebook.com/groups/*' })
  for (const tab of tabs) {
    if (tab.url?.includes(group.slug)) {
      await chrome.tabs.reload(tab.id, { bypassCache: false }).catch(() => {})
      break  // solo un reload por grupo
    }
  }
})

// ── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await updateBadge()
  await syncReloadAlarms()
})

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge()
  await syncReloadAlarms()
})

// Re-sync alarmas si el usuario edita grupos o settings
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.groups || changes.settings) {
    syncReloadAlarms().catch(() => {})
  }
})
