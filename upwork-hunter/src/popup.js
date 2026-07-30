// Upwork Hunter — Popup Script
//
// Solo estado de conexión + configuración. La lista de jobs, filtros, score y
// alertas se ven/oyen en el dashboard del CRM. Una vez que ya hay URL + API
// key guardadas, no se vuelven a pedir — el control que importa día a día es
// el intervalo de escaneo, así que ese queda al frente y se guarda solo.

let cfg = {};
let connectionFieldsVisible = null; // null = todavía no decidido

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEvents();
});

async function loadState() {
  const data = await chrome.storage.local.get([
    'config', 'lastScan', 'lastSentAt', 'lastSendError', 'sentCount',
  ]);
  cfg = data.config || {};

  const enabled = cfg.enabled !== false;
  setToggle(document.getElementById('enabled'), enabled);
  document.getElementById('crm-url').value = cfg.crmUrl || 'http://localhost:3000';
  document.getElementById('crm-key').value = cfg.crmApiKey || '';
  document.getElementById('interval').value = String(cfg.intervalMinutes || 5);

  const dashboardUrl = `${(cfg.crmUrl || 'http://localhost:3000').replace(/\/$/, '')}/dashboard/upwork`;
  document.getElementById('dashboard-link').href = dashboardUrl;

  // Solo decide la visibilidad inicial una vez — después la maneja el link
  // "Editar conexión", no este re-render (que dispara en cada cambio de storage).
  const configured = !!(cfg.crmUrl && cfg.crmApiKey);
  if (connectionFieldsVisible === null) connectionFieldsVisible = !configured;
  document.getElementById('connection-section').style.display = connectionFieldsVisible ? 'block' : 'none';
  document.getElementById('edit-connection-link').style.display = (!connectionFieldsVisible && configured) ? 'inline' : 'none';

  const dot = document.getElementById('dot');
  const statusText = document.getElementById('status-text');
  const errorText = document.getElementById('error-text');

  if (!enabled) {
    dot.classList.remove('live', 'error');
    statusText.textContent = 'Pausado';
  } else if (data.lastSendError) {
    dot.classList.add('error');
    dot.classList.remove('live');
    statusText.textContent = 'Error al conectar con el CRM';
  } else if (data.lastSentAt) {
    dot.classList.add('live');
    dot.classList.remove('error');
    statusText.innerHTML = `Conectado · último envío <strong>${timeAgo(new Date(data.lastSentAt))}</strong>`;
  } else {
    dot.classList.remove('live', 'error');
    statusText.textContent = 'Activo · esperando primer escaneo…';
  }

  if (data.lastSendError) {
    errorText.style.display = 'block';
    errorText.textContent = data.lastSendError;
  } else {
    errorText.style.display = 'none';
  }

  const statsEl = document.getElementById('stats-text');
  const parts = [];
  if (data.sentCount) parts.push(`<strong>${data.sentCount}</strong> jobs capturados en total`);
  if (data.lastScan) parts.push(`último escaneo ${timeAgo(new Date(data.lastScan))}`);
  statsEl.innerHTML = parts.join(' · ');
}

function setToggle(el, on) {
  el.classList.toggle('on', on);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
}

async function saveConfig(patch) {
  cfg = { ...cfg, ...patch };
  await chrome.storage.local.set({ config: cfg });
  chrome.runtime.sendMessage({ type: 'UPDATE_CONFIG', config: cfg });
}

function setupEvents() {
  document.getElementById('enabled').addEventListener('click', async () => {
    const el = document.getElementById('enabled');
    const next = !el.classList.contains('on');
    setToggle(el, next);
    await saveConfig({ enabled: next });
  });

  document.getElementById('save-connection-btn').addEventListener('click', async () => {
    const crmUrl = document.getElementById('crm-url').value.trim() || 'http://localhost:3000';
    const crmApiKey = document.getElementById('crm-key').value.trim();
    await saveConfig({ crmUrl, crmApiKey });

    const btn = document.getElementById('save-connection-btn');
    btn.textContent = '✓ Guardado';
    setTimeout(() => { btn.textContent = 'Guardar conexión'; }, 1500);

    // Una vez guardada, se colapsa — ya no hay que volver a pedirla.
    connectionFieldsVisible = false;
    loadState();
  });

  document.getElementById('edit-connection-link').addEventListener('click', (e) => {
    e.preventDefault();
    connectionFieldsVisible = true;
    loadState();
  });

  // El intervalo se guarda solo al cambiarlo — sin botón, sin pedir nada más.
  document.getElementById('interval').addEventListener('change', async (e) => {
    await saveConfig({ intervalMinutes: parseInt(e.target.value) || 5 });
  });

  document.getElementById('scan-btn').addEventListener('click', async () => {
    const btn = document.getElementById('scan-btn');
    btn.textContent = 'Escaneando…';
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: 'SCAN_NOW' });
    setTimeout(() => {
      btn.textContent = 'Escanear ahora';
      btn.disabled = false;
      loadState();
    }, 3000);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.lastScan || changes.lastSentAt || changes.lastSendError || changes.sentCount || changes.config) {
      loadState();
    }
  });
}

function timeAgo(date) {
  if (!date || isNaN(date)) return ''
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}
