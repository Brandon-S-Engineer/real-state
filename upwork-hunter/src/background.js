// Upwork Hunter — Background Service Worker
//
// Solo captura jobs y los manda al CRM. Todo lo demás — scoring, filtros,
// y las alertas — vive en /dashboard/upwork. Esta extensión no notifica nada
// localmente a propósito: la idea es tener una sola fuente de alertas (el
// CRM), no dos sistemas avisando cosas distintas.

const DEFAULT_CONFIG = {
  intervalMinutes: 5,
  enabled: true,
  crmUrl: 'http://localhost:3000',
  crmApiKey: '',
};

chrome.runtime.onInstalled.addListener(async () => {
  const { config } = await chrome.storage.local.get('config');
  if (!config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG, seenJobs: {}, sentCount: 0 });
  } else {
    await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG, ...config } });
  }
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(scheduleAlarm);

// Jitter fijo de ±30s sin importar el intervalo base — así "1 min" cae entre
// 30s y 1min30s, "5 min" entre 4min30s y 5min30s, etc. La idea es no recargar
// siempre al segundo exacto (se nota más, parece un bot) sin que el jitter
// se vuelva proporcionalmente enorme en intervalos largos.
const JITTER_MINUTES = 0.5;

function randomDelay(baseMinutes) {
  const min = Math.max(0.1, baseMinutes - JITTER_MINUTES);
  const max = baseMinutes + JITTER_MINUTES;
  return min + Math.random() * (max - min);
}

async function scheduleAlarm() {
  chrome.alarms.clearAll();
  const { config } = await chrome.storage.local.get('config');
  const cfg = config || DEFAULT_CONFIG;
  if (!cfg.enabled) return;
  chrome.alarms.create('scan', { delayInMinutes: randomDelay(cfg.intervalMinutes) });
}

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name !== 'scan') return;
  await reloadUpworkTabs();
  scheduleAlarm();
});

async function reloadUpworkTabs() {
  const tabs = await chrome.tabs.query({ url: 'https://www.upwork.com/*' });
  for (const tab of tabs) {
    if (tab.url && tab.url.includes('/jobs')) chrome.tabs.reload(tab.id);
  }
  await chrome.storage.local.set({ lastScan: new Date().toISOString() });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'JOBS_FOUND') {
    processJobs(msg.jobs);
    return;
  }
  if (msg.type === 'UPDATE_CONFIG') {
    chrome.storage.local.set({ config: msg.config }).then(scheduleAlarm);
    return;
  }
  if (msg.type === 'SCAN_NOW') {
    reloadUpworkTabs();
    return;
  }
  if (msg.type === 'CLEAR_SEEN') {
    chrome.storage.local.set({ seenJobs: {} });
    return;
  }
});

// ── Envío al CRM ─────────────────────────────────────────────────────────────

async function sendJobsToCrm(jobs, cfg) {
  if (!cfg.crmUrl || !cfg.crmApiKey) {
    await chrome.storage.local.set({
      lastSendError: 'CRM no configurado. Abre el popup y guarda la URL + API key.',
    });
    return false;
  }

  const url = `${cfg.crmUrl.replace(/\/$/, '')}/api/upwork/jobs`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.crmApiKey}`,
      },
      body: JSON.stringify(jobs),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const error = res.status === 401
        ? 'API key inválida o expirada'
        : `HTTP ${res.status}: ${errBody.slice(0, 120)}`;
      await chrome.storage.local.set({ lastSendError: error });
      return false;
    }

    const data = await res.json();
    const { sentCount = 0 } = await chrome.storage.local.get('sentCount');
    await chrome.storage.local.set({
      lastSendError: null,
      lastSentAt: new Date().toISOString(),
      sentCount: sentCount + (data.created ?? 0) + (data.updated ?? 0),
    });
    return true;
  } catch (err) {
    await chrome.storage.local.set({ lastSendError: `No se pudo conectar: ${err.message}` });
    return false;
  }
}

// ── Job processing ────────────────────────────────────────────────────────────

async function processJobs(jobs) {
  const { config, seenJobs = {} } = await chrome.storage.local.get(['config', 'seenJobs']);
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Dedup local: solo informativo (cuántos jobs son realmente nuevos en esta
  // pestaña) — no decide si se manda al CRM. El CRM hace su propio upsert por
  // uid, así que reenviar jobs ya vistos para refrescar proposals/postedHours
  // es seguro y deseable.
  const freshJobs = jobs.filter((j) => !seenJobs[j.uid]);
  const updatedSeen = { ...seenJobs };
  for (const job of freshJobs) updatedSeen[job.uid] = Date.now();

  // Cleanup de seenJobs viejos (>3 días)
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  for (const uid in updatedSeen) {
    if (updatedSeen[uid] < cutoff) delete updatedSeen[uid];
  }
  await chrome.storage.local.set({ seenJobs: updatedSeen });

  if (jobs.length === 0) return;

  await sendJobsToCrm(jobs, cfg);
}
