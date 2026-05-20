// ── Keyword matcher ──────────────────────────────────────────────────────────
//
// Match case-insensitive, accent-insensitive (NFKD normalize).
// Una alerta se dispara cuando:
//   - Hay al menos UNA coincidencia con keyword positiva
//   - Y NO hay ninguna coincidencia con keyword negativa

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Match text against keyword lists.
 * @param {string} text
 * @param {{ positive: string[], negative: string[] }} keywords
 * @returns {{ matched: boolean, matches: string[], blockedBy: string|null }}
 */
export function matchKeywords(text, keywords) {
  const norm = normalize(text)

  // Check negatives first — si alguna match, descartado.
  for (const neg of keywords.negative ?? []) {
    if (!neg.trim()) continue
    if (norm.includes(normalize(neg))) {
      return { matched: false, matches: [], blockedBy: neg }
    }
  }

  const matches = []
  for (const pos of keywords.positive ?? []) {
    if (!pos.trim()) continue
    if (norm.includes(normalize(pos))) matches.push(pos)
  }

  return { matched: matches.length > 0, matches, blockedBy: null }
}
