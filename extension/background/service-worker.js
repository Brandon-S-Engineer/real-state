// ── Service worker ───────────────────────────────────────────────────────────
//
// Coordina alertas, dedupe, badge count, y reloads programados.

import { getAlerts, setAlerts, getGroups, setGroups, getSettings } from '../shared/storage.js'

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
  if (msg.type === 'SYNC_RELOAD_ALARMS') {
    syncReloadAlarms().then(() => sendResponse({ ok: true }))
    return true
  }
  return false
})

// ── Alert handling ───────────────────────────────────────────────────────────

async function handleNewAlert(alert) {
  const alerts = await getAlerts()

  // Dedup por id
  if (alerts.some((a) => a.id === alert.id)) {
    return { ok: true, deduped: true }
  }

  // Prepend + cap a 500
  const updated = [alert, ...alerts].slice(0, 500)
  await setAlerts(updated)

  // Incrementar contador del grupo
  const groups = await getGroups()
  await setGroups(groups.map((g) =>
    g.id === alert.groupId
      ? { ...g, alertCount: (g.alertCount ?? 0) + 1 }
      : g
  ))

  await updateBadge()
  return { ok: true, deduped: false }
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
