import {
  getGroups, setGroups, getKeywords, setKeywords,
  getSettings, setSettings, getTemplates, setTemplates,
  generateId, extractGroupSlug,
} from '../shared/storage.js'
import { DEFAULT_TEMPLATES, composeMessage, textToBlock } from '../shared/templates.js'
import { MACBOOK_POSITIVES, MACBOOK_NEGATIVES } from '../shared/presets.js'

function $(id) { return document.getElementById(id) }

// ── Auto-save indicator ──────────────────────────────────────────────────────

let saveTimeout = null
function flashSaved() {
  const el = $('save-indicator')
  el.textContent = '✓ Guardado'
  el.style.color = '#4ade80'
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    el.textContent = 'Cambios guardados automáticamente'
    el.style.color = ''
  }, 1500)
}

// ── Groups ───────────────────────────────────────────────────────────────────

let editingGroupId = null

async function renderGroups() {
  const groups = await getGroups()
  const list = $('groups-list')
  list.innerHTML = ''

  if (groups.length === 0) {
    $('groups-empty').classList.remove('hidden')
    return
  }
  $('groups-empty').classList.add('hidden')

  for (const g of groups) {
    const li = document.createElement('li')
    li.className = `group-row ${g.enabled ? '' : 'disabled'}`
    li.innerHTML = `
      <div class="group-row-info">
        <div class="group-row-name">${escapeHtml(g.name)}</div>
        <div class="group-row-url">${escapeHtml(g.url)}</div>
      </div>
      <div class="group-row-actions">
        <button class="icon-btn" data-act="toggle" title="${g.enabled ? 'Pausar' : 'Activar'}">${g.enabled ? '⏸' : '▶'}</button>
        <button class="icon-btn" data-act="open" title="Abrir">↗</button>
        <button class="icon-btn" data-act="edit" title="Editar">✎</button>
        <button class="icon-btn danger" data-act="delete" title="Borrar">🗑</button>
      </div>
    `

    li.querySelector('[data-act="toggle"]').onclick = async () => {
      const groups = await getGroups()
      await setGroups(groups.map((x) => x.id === g.id ? { ...x, enabled: !x.enabled } : x))
      flashSaved()
      renderGroups()
    }
    li.querySelector('[data-act="open"]').onclick = () => {
      chrome.tabs.create({ url: g.url })
    }
    li.querySelector('[data-act="edit"]').onclick = () => {
      editingGroupId = g.id
      openGroupForm(g)
    }
    li.querySelector('[data-act="delete"]').onclick = async () => {
      if (!confirm(`¿Borrar el grupo "${g.name}"? Las alertas que ya tienes de él se conservan.`)) return
      const groups = await getGroups()
      await setGroups(groups.filter((x) => x.id !== g.id))
      flashSaved()
      renderGroups()
    }

    list.appendChild(li)
  }
}

function openGroupForm(group = null) {
  const form = $('group-form')
  $('g-name').value = group?.name ?? ''
  $('g-url').value = group?.url ?? ''
  $('g-enabled').checked = group?.enabled ?? true
  $('g-interval').value = group?.intervalMin ?? 10
  editingGroupId = group?.id ?? null
  form.classList.remove('hidden')
  $('g-name').focus()
}

function closeGroupForm() {
  $('group-form').classList.add('hidden')
  editingGroupId = null
}

async function saveGroupForm() {
  const name = $('g-name').value.trim()
  const url = $('g-url').value.trim()
  if (!name || !url) {
    alert('Nombre y URL son requeridos.')
    return
  }
  const slug = extractGroupSlug(url)
  if (!slug) {
    alert('URL inválida — debe ser una URL completa de un grupo de Facebook.')
    return
  }
  const enabled = $('g-enabled').checked
  const intervalMin = parseInt($('g-interval').value, 10) || 10

  const groups = await getGroups()
  if (editingGroupId) {
    await setGroups(groups.map((g) =>
      g.id === editingGroupId
        ? { ...g, name, url, slug, enabled, intervalMin }
        : g
    ))
  } else {
    if (groups.some((g) => g.slug === slug)) {
      alert('Ya tienes un grupo con esta URL.')
      return
    }
    await setGroups([
      ...groups,
      { id: generateId(), name, url, slug, enabled, intervalMin, alertCount: 0 },
    ])
  }
  flashSaved()
  closeGroupForm()
  renderGroups()
}

// ── Keywords ─────────────────────────────────────────────────────────────────

let kwTimeout = null
function debounceSaveKeywords() {
  clearTimeout(kwTimeout)
  kwTimeout = setTimeout(async () => {
    const positive = $('kw-positive').value.split('\n').map((s) => s.trim()).filter(Boolean)
    const negative = $('kw-negative').value.split('\n').map((s) => s.trim()).filter(Boolean)
    await setKeywords({ positive, negative })
    flashSaved()
  }, 400)
}

async function loadKeywords() {
  const kw = await getKeywords()
  $('kw-positive').value = (kw.positive ?? []).join('\n')
  $('kw-negative').value = (kw.negative ?? []).join('\n')
}

function mergeUnique(existing, preset) {
  // Preserva el orden actual del usuario, agrega al final lo nuevo del preset.
  const seen = new Set(existing.map((s) => s.toLowerCase()))
  const additions = preset.filter((s) => !seen.has(s.toLowerCase()))
  return [...existing, ...additions]
}

async function loadPositivesPack() {
  const current = $('kw-positive').value.split('\n').map((s) => s.trim()).filter(Boolean)
  const merged = mergeUnique(current, MACBOOK_POSITIVES)
  const added = merged.length - current.length
  $('kw-positive').value = merged.join('\n')
  debounceSaveKeywords()
  if (added > 0) {
    flashSaved()
    const el = $('save-indicator')
    el.textContent = `✓ ${added} keywords agregadas`
    setTimeout(() => { el.textContent = 'Cambios guardados automáticamente' }, 2000)
  } else {
    alert('Ya tienes todas las keywords del pack.')
  }
}

async function loadNegativesPack() {
  const current = $('kw-negative').value.split('\n').map((s) => s.trim()).filter(Boolean)
  const merged = mergeUnique(current, MACBOOK_NEGATIVES)
  const added = merged.length - current.length
  $('kw-negative').value = merged.join('\n')
  debounceSaveKeywords()
  if (added > 0) {
    flashSaved()
    const el = $('save-indicator')
    el.textContent = `✓ ${added} negativas agregadas`
    setTimeout(() => { el.textContent = 'Cambios guardados automáticamente' }, 2000)
  } else {
    alert('Ya tienes todas las negativas del pack.')
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

let tplTimeout = null

async function loadTemplates() {
  const t = await getTemplates()
  $('tpl-zona').value = t.zona ?? ''
  $('tpl-saludo').value = (t.blocks.saludo ?? []).join('\n')
  $('tpl-referencia').value = (t.blocks.referencia ?? []).join('\n')
  $('tpl-presentacion').value = (t.blocks.presentacion ?? []).join('\n')
  $('tpl-oferta').value = (t.blocks.oferta ?? []).join('\n')
  $('tpl-cierre').value = (t.blocks.cierre ?? []).join('\n')
  await renderPreview()
}

async function renderPreview() {
  const t = await getTemplates()
  $('tpl-preview-text').textContent = composeMessage(t, 'María')
}

function debounceSaveTemplates() {
  clearTimeout(tplTimeout)
  tplTimeout = setTimeout(async () => {
    const blocks = {
      saludo: textToBlock($('tpl-saludo').value),
      referencia: textToBlock($('tpl-referencia').value),
      presentacion: textToBlock($('tpl-presentacion').value),
      oferta: textToBlock($('tpl-oferta').value),
      cierre: textToBlock($('tpl-cierre').value),
    }
    await setTemplates({ zona: $('tpl-zona').value.trim(), blocks })
    flashSaved()
    await renderPreview()
  }, 400)
}

async function resetTemplates() {
  if (!confirm('¿Restaurar las plantillas a sus valores por defecto? Tus cambios se perderán.')) return
  await chrome.storage.local.set({ templates: DEFAULT_TEMPLATES })
  await loadTemplates()
  flashSaved()
}

// ── CRM settings ─────────────────────────────────────────────────────────────

let crmTimeout = null
function debounceSaveCrm() {
  clearTimeout(crmTimeout)
  crmTimeout = setTimeout(async () => {
    const crmUrl = $('crm-url').value.trim()
    const crmApiKey = $('crm-key').value.trim()
    await setSettings({ crmUrl, crmApiKey })
    flashSaved()
  }, 400)
}

async function loadSettings() {
  const s = await getSettings()
  $('crm-url').value = s.crmUrl ?? ''
  $('crm-key').value = s.crmApiKey ?? ''
}

async function testCrm() {
  const status = $('crm-status')
  const s = await getSettings()
  if (!s.crmUrl || !s.crmApiKey) {
    status.textContent = 'Falta URL o API key.'
    status.className = 'status error'
    return
  }
  status.textContent = 'Probando...'
  status.className = 'status muted'
  try {
    // Lote vacío: valida URL + API key sin crear nada
    const res = await fetch(`${s.crmUrl.replace(/\/$/, '')}/api/electronicos/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.crmApiKey}`,
      },
      body: JSON.stringify({ source: 'MARKETPLACE', sourceKey: 'test', sourceName: 'test', countsAsSession: false, listings: [] }),
    })
    if (res.ok) {
      status.textContent = '✓ Conectado a Precios Electrónicos.'
      status.className = 'status ok'
    } else if (res.status === 401) {
      status.textContent = '✗ API key inválida o sesión no válida.'
      status.className = 'status error'
    } else {
      status.textContent = `✗ Error ${res.status}`
      status.className = 'status error'
    }
  } catch (err) {
    status.textContent = `✗ No se pudo conectar: ${err.message}`
    status.className = 'status error'
  }
}

// ── Utils ────────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await renderGroups()
  await loadKeywords()
  await loadTemplates()
  await loadSettings()

  // Groups
  $('add-group-btn').addEventListener('click', () => openGroupForm())
  $('g-save').addEventListener('click', saveGroupForm)
  $('g-cancel').addEventListener('click', closeGroupForm)

  // Keywords
  $('kw-positive').addEventListener('input', debounceSaveKeywords)
  $('kw-negative').addEventListener('input', debounceSaveKeywords)
  $('load-positives-pack').addEventListener('click', loadPositivesPack)
  $('load-negatives-pack').addEventListener('click', loadNegativesPack)

  // Templates
  ;['tpl-zona', 'tpl-saludo', 'tpl-referencia', 'tpl-presentacion', 'tpl-oferta', 'tpl-cierre']
    .forEach((id) => $(id).addEventListener('input', debounceSaveTemplates))
  $('tpl-preview-regen').addEventListener('click', renderPreview)
  $('templates-reset').addEventListener('click', resetTemplates)

  // CRM
  $('crm-url').addEventListener('input', debounceSaveCrm)
  $('crm-key').addEventListener('input', debounceSaveCrm)
  $('crm-test').addEventListener('click', testCrm)
})
