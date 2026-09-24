// ── Storage helpers para la extensión ────────────────────────────────────────
//
// Toda la persistencia vive en chrome.storage.local (10MB, sobra para miles
// de alertas). La estructura está documentada abajo.

/**
 * Shape de los datos en storage:
 *
 * groups: Array<{
 *   id: string,           // cuid local generado por la extensión
 *   name: string,         // "Vecinos de Interlomas"
 *   url: string,          // URL completa al grupo
 *   slug: string,         // identificador extraído del URL para matching
 *   enabled: boolean,
 *   intervalMin: number,  // reload jitter base (override del global)
 *   alertCount: number,   // alertas totales registradas (informativo)
 * }>
 *
 * keywords: {
 *   positive: string[],   // ["busco departamento", "compro", ...]
 *   negative: string[],   // ["rento", "vendo mi", ...]   ← Fase 4
 * }
 *
 * alerts: Array<{
 *   id: string,           // permalink o hash del autor+texto
 *   groupId: string,
 *   groupName: string,
 *   author: string,
 *   text: string,
 *   permalink: string|null,
 *   detectedAt: number,   // timestamp ms
 *   type: 'POST' | 'COMMENT',
 *   state: 'new' | 'viewed' | 'contacted' | 'saved' | 'dismissed',
 * }>
 *
 * settings: {
 *   crmUrl: string,        // "http://localhost:3000"
 *   crmApiKey: string,     // "rsk_..."
 *   reloadIntervalMin: number,   // base global (default 10)
 *   reloadJitterMin: number,     // ± (default 5)
 *   pauseStart: string,    // "23:00"
 *   pauseEnd: string,      // "07:00"
 * }
 */

import { DEFAULT_TEMPLATES } from './templates.js'

export const DEFAULTS = {
  groups: [],
  keywords: { positive: [], negative: [] },
  alerts: [],
  authors: {},
  settings: {
    crmUrl: 'http://localhost:3000',
    crmApiKey: '',
    reloadIntervalMin: 10,
    reloadJitterMin: 5,
    pauseStart: '23:00',
    pauseEnd: '07:00',
  },
  templates: DEFAULT_TEMPLATES,
}

export async function getAll() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULTS))
  return { ...DEFAULTS, ...data, settings: { ...DEFAULTS.settings, ...(data.settings ?? {}) } }
}

export async function getGroups() {
  const { groups = [] } = await chrome.storage.local.get('groups')
  return groups
}

export async function setGroups(groups) {
  await chrome.storage.local.set({ groups })
}

export async function getKeywords() {
  const { keywords } = await chrome.storage.local.get('keywords')
  return keywords ?? DEFAULTS.keywords
}

export async function setKeywords(keywords) {
  await chrome.storage.local.set({ keywords })
}

export async function getAlerts() {
  const { alerts = [] } = await chrome.storage.local.get('alerts')
  return alerts
}

export async function setAlerts(alerts) {
  await chrome.storage.local.set({ alerts })
}

export async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings')
  return { ...DEFAULTS.settings, ...(settings ?? {}) }
}

export async function setSettings(patch) {
  const current = await getSettings()
  await chrome.storage.local.set({ settings: { ...current, ...patch } })
}

export async function getTemplates() {
  const { templates } = await chrome.storage.local.get('templates')
  if (!templates) return DEFAULTS.templates
  return {
    zona: templates.zona ?? DEFAULTS.templates.zona,
    blocks: { ...DEFAULTS.templates.blocks, ...(templates.blocks ?? {}) },
  }
}

export async function setTemplates(patch) {
  const current = await getTemplates()
  await chrome.storage.local.set({
    templates: {
      zona: patch.zona ?? current.zona,
      blocks: { ...current.blocks, ...(patch.blocks ?? {}) },
    },
  })
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Extrae el slug del grupo desde su URL.
 *   "https://www.facebook.com/groups/123456789/?ref=x" → "123456789"
 *   "https://www.facebook.com/groups/vecinosdeinterlomas/" → "vecinosdeinterlomas"
 */
export function extractGroupSlug(url) {
  try {
    const u = new URL(url)
    const m = u.pathname.match(/^\/groups\/([^/]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}
