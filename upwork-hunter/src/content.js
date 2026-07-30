// Upwork Hunter — Content Script

(function () {
  // If a previous script instance is still alive, skip. If its context was
  // invalidated (extension reload), take over by resetting the flag.
  if (window.__upworkHunterLoaded) {
    try { chrome.runtime.getURL(''); } catch (_) { window.__upworkHunterLoaded = false; }
    if (window.__upworkHunterLoaded) return;
  }
  window.__upworkHunterLoaded = true;

  function parseJobs() {
    const jobs = [];
    // Layout nuevo: div[data-test="JobTile"]. Layout viejo: article[data-ev-job-uid].
    const tiles = document.querySelectorAll('[data-test="JobTile"], article[data-ev-job-uid]');

    tiles.forEach(tile => {
      // Título y href. data-test ahora puede traer 2 valores ("job-tile-title-link UpLink"),
      // por eso usamos ~= (coincide con palabra dentro del atributo).
      const titleLink = tile.querySelector('[data-test~="job-tile-title-link"], [data-test="job-tile-title-link"]');
      const title = titleLink ? titleLink.textContent.trim().replace(/\s+/g, ' ') : '';
      const href = titleLink ? titleLink.getAttribute('href') : '';
      const url = href ? `https://www.upwork.com${href.split('?')[0]}` : '';

      // UID: el atributo viejo, o lo extraemos del href ("..._~021987298675811319452/").
      let uid = tile.getAttribute('data-ev-job-uid') || '';
      if (!uid && href) {
        const m = href.match(/~([0-9a-z]+)/i);
        if (m) uid = m[1];
      }
      if (!uid && url) uid = url; // último recurso: la url como id estable

      const proposalEl = tile.querySelector('[data-test="proposals-tier"]');
      const proposalText = proposalEl ? proposalEl.textContent.trim() : '';
      const proposals = parseProposals(proposalText);

      const spentEl = tile.querySelector('[data-test="total-spent"] strong');
      const spentText = spentEl ? spentEl.textContent.trim() : '';
      const clientSpent = parseSpent(spentText);

      // Fecha: el elemento contenedor trae "Posted 4 minutes ago"; el span interno
      // solo dice "Posted", así que leemos el textContent completo del contenedor.
      const dateEl = tile.querySelector('[data-test="job-pubilshed-date"]');
      const postedText = dateEl ? dateEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const postedHours = parsePostedHours(postedText);

      // Budget fijo: la sección is-fixed-price trae "Est. budget: $3,000.00"
      let budget = '';
      const budgetSection = tile.querySelector('[data-test="is-fixed-price"], [data-test="is-hourly"]');
      if (budgetSection) {
        for (const el of budgetSection.querySelectorAll('strong, span, .rr-mask')) {
          const t = el.textContent.trim();
          if (t.includes('$')) { budget = t; break; }
        }
      }
      // Fallback hourly: job-type-label trae "Hourly: $8.00 - $50.00"
      if (!budget) {
        const typeEl = tile.querySelector('[data-test="job-type-label"]');
        const t = typeEl ? typeEl.textContent.trim() : '';
        if (t.includes('$')) budget = t.replace(/^hourly:\s*/i, '').trim();
      }

      const descEl = tile.querySelector('[data-test~="JobDescription"] p, [data-test="JobDescription"] p, .air3-line-clamp p, [data-test="line-clamp"] p, .fluid-line-clamp p, .fluid-line-clamp-content p');
      const description = descEl ? descEl.textContent.trim().replace(/\s+/g, ' ') : '';

      const skillEls = tile.querySelectorAll('[data-test~="JobAttrs"] .air3-token, [data-test="skill-badge"], .air3-token');
      const skillList = [...new Set(
        Array.from(skillEls)
          .map(el => el.textContent.trim().replace(/\s+/g, ' '))
          .filter(Boolean)
      )];
      const skills = skillList.join(' ');

      if (title && uid) {
        jobs.push({ uid, title, url, description, skills, skillList, proposals, proposalText, clientSpent, spentText, postedText, postedHours, budget });
      }
    });

    return jobs;
  }

  function parsePostedHours(text) {
    if (!text) return 999;
    const t = text.toLowerCase().trim().replace(/^posted\s*/i, '');

    // Special phrases without a number — must come BEFORE numeric parsing,
    // otherwise "yesterday" matches /day/ with num=0 and looks like "just now".
    if (/just now|moments? ago|ahora mismo|hace un momento/.test(t)) return 0;
    if (/yesterday|ayer/.test(t)) return 24;
    if (/\ban?\s+minute|\bun\s+minuto/.test(t))  return 1 / 60;
    if (/\ban?\s+hour|\buna?\s+hora/.test(t))    return 1;
    if (/\ban?\s+day|\bun\s+d[ií]a/.test(t))     return 24;
    if (/\ban?\s+week|\buna?\s+semana/.test(t))  return 168;
    if (/\ban?\s+month|\bun\s+mes/.test(t))      return 720;

    // Abbreviated form: "1d", "17m", "1h", "2w", "30s"
    // Word boundary keeps "m" from matching "month"/"mes".
    const abbr = t.match(/^\s*(\d+(?:[.,]\d+)?)\s*([smhdwy])\b/);
    if (abbr) {
      const n = parseFloat(abbr[1].replace(',', '.')) || 0;
      const u = abbr[2];
      if (u === 's') return n / 3600;
      if (u === 'm') return n / 60;
      if (u === 'h') return n;
      if (u === 'd') return n * 24;
      if (u === 'w') return n * 168;
      if (u === 'y') return n * 8760;
    }

    // Numeric form with full unit word (EN + ES).
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(minute|minuto|hour|hora|day|d[ií]a|week|semana|month|mes|year|a[ñn]o)/);
    if (!m) return 999;
    const n = parseFloat(m[1].replace(',', '.')) || 0;
    const unit = m[2];
    if (/^minut/.test(unit)) return n / 60;
    if (/^hor|^hour/.test(unit)) return n;
    if (/^d/.test(unit)) return n * 24;
    if (/^(week|semana)/.test(unit)) return n * 168;
    if (/^(month|mes)/.test(unit)) return n * 720;
    if (/^(year|a[ñn]o)/.test(unit)) return n * 8760;
    return 999;
  }

  function parseProposals(text) {
    // Upwork no renderiza [data-test="proposals-tier"] cuando el job tiene 0
    // propuestas (nada que mostrar), no cuando tiene muchísimas — así que la
    // ausencia del elemento significa "0 propuestas", no "desconocido/muchas".
    if (!text) return 0;
    // Quita la etiqueta "Proposals:" y normaliza. Tiers nuevos de Upwork:
    // "Less than 5", "5 to 10", "10 to 15", "15 to 20", "20 to 50", "50+".
    const t = text.toLowerCase().replace(/proposals?:/g, '').trim();
    if (/less than 5|fewer than 5/.test(t)) return 2;
    const nums = (t.match(/\d+/g) || []).map(Number);
    if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2); // "5 to 10" -> 8
    if (nums.length === 1) return nums[0];                            // "50+" -> 50
    return 99;
  }

  function parseSpent(text) {
    if (!text) return 0;
    const clean = text.replace(/[$,\s]/g, '').toUpperCase();
    if (clean.includes('K')) return parseFloat(clean) * 1000;
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  function reportJobs() {
    const jobs = parseJobs();
    if (jobs.length === 0) return;
    try {
      chrome.runtime.sendMessage({ type: 'JOBS_FOUND', jobs, url: window.location.href })
        .catch(() => {});
    } catch (_) {
      // Extension context invalidated — nothing to do
    }
  }

  reportJobs();

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(reportJobs, 800);
  });

  const container = document.querySelector('[data-test="JobsList"], .card-list-container, [data-v-5ce431a8]');
  observer.observe(container || document.body, { childList: true, subtree: !!container });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SCAN_NOW') reportJobs();
  });
})();
