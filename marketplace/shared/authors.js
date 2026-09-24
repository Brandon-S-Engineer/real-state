// ── Author intelligence ──────────────────────────────────────────────────────
//
// Trackeamos cada autor que ha posteado en cualquier grupo monitoreado.
// Útil para:
//   - Detectar agentes recurrentes (5+ posts/semana) y marcarlos para ignorar
//   - Cross-group detection (mismo autor en varios grupos = comprador serio)
//   - Auto-filtrar futuras alertas de agentes conocidos
//
// Identidad estable: usamos el userId de Facebook extraído del href del link
// de perfil (`/groups/X/user/12345/` o `/profile.php?id=12345`). Eso sobrevive
// cambios de nombre, mientras que matchear por nombre fallaría con homónimos.

const MAX_POSTS_PER_AUTHOR = 50  // cap del historial por autor

// ── Extracción del authorId desde un href ─────────────────────────────────────

export function extractAuthorIdFromHref(href) {
  if (!href || typeof href !== 'string') return null
  // /groups/X/user/12345/ → "fb_12345"
  let m = href.match(/\/user\/(\d+)/)
  if (m) return `fb_${m[1]}`
  // /profile.php?id=12345 → "fb_12345"
  m = href.match(/[?&]id=(\d+)/)
  if (m) return `fb_${m[1]}`
  // /username.lastname → "fb_username.lastname"
  m = href.match(/^\/([^/?#]+)/)
  if (m && m[1] !== 'groups' && m[1] !== 'profile.php' && m[1] !== 'people') {
    return `fb_${m[1]}`
  }
  // /people/Name/12345/ → "fb_people_12345"
  m = href.match(/^\/people\/[^/]+\/(\d+)/)
  if (m) return `fb_${m[1]}`
  return null
}

// ── Storage helpers ──────────────────────────────────────────────────────────

export async function getAuthors() {
  const { authors = {} } = await chrome.storage.local.get('authors')
  return authors
}

export async function getAuthor(authorId) {
  if (!authorId) return null
  const authors = await getAuthors()
  return authors[authorId] ?? null
}

async function saveAuthor(author) {
  const authors = await getAuthors()
  authors[author.id] = author
  await chrome.storage.local.set({ authors })
}

/**
 * Registra un post de un autor. Actualiza nombres, contadores y posts recientes.
 * @param {string} authorId
 * @param {string} authorName
 * @param {object} postInfo  { alertId, groupId, groupName, postedAt, detectedAt, matchedKeywords }
 */
export async function recordAuthorPost(authorId, authorName, postInfo) {
  if (!authorId) return null
  const authors = await getAuthors()
  const existing = authors[authorId]
  const now = Date.now()

  if (existing) {
    // Evitar duplicado del mismo alertId
    const alreadyRecorded = existing.posts.some((p) => p.alertId === postInfo.alertId)
    const posts = alreadyRecorded
      ? existing.posts
      : [postInfo, ...existing.posts].slice(0, MAX_POSTS_PER_AUTHOR)
    const nameVariants = existing.nameVariants?.includes(authorName)
      ? existing.nameVariants
      : [...(existing.nameVariants ?? []), authorName].filter(Boolean).slice(-10)

    authors[authorId] = {
      ...existing,
      name: authorName || existing.name,
      nameVariants,
      lastSeenAt: now,
      posts,
    }
  } else {
    authors[authorId] = {
      id: authorId,
      name: authorName ?? '(sin nombre)',
      nameVariants: authorName ? [authorName] : [],
      firstSeenAt: now,
      lastSeenAt: now,
      posts: [postInfo],
      markedAsAgent: false,
      note: '',
    }
  }

  await chrome.storage.local.set({ authors })
  return authors[authorId]
}

export async function setMarkedAsAgent(authorId, marked, note) {
  if (!authorId) return
  const authors = await getAuthors()
  if (!authors[authorId]) return
  authors[authorId] = {
    ...authors[authorId],
    markedAsAgent: !!marked,
    note: typeof note === 'string' ? note : authors[authorId].note ?? '',
  }
  await chrome.storage.local.set({ authors })
}

// ── Stats derivados (computados al render) ────────────────────────────────────

export function postsInLastDays(author, days = 30) {
  if (!author?.posts) return 0
  const cutoff = Date.now() - days * 86_400_000
  return author.posts.filter((p) => (p.postedAt ?? p.detectedAt) >= cutoff).length
}

export function groupsCount(author) {
  if (!author?.posts) return 0
  return new Set(author.posts.map((p) => p.groupId)).size
}

export function groupsList(author) {
  if (!author?.posts) return []
  const seen = new Map()
  for (const p of author.posts) {
    if (!seen.has(p.groupId)) seen.set(p.groupId, p.groupName)
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
}
