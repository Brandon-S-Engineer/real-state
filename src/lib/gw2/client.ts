// ── Cliente de la API pública de GW2 (api.guildwars2.com/v2) ─────────────────
//
// Compartido entre scripts standalone (sync de ítems, colector) y rutas de
// Next.js. Un solo token bucket por proceso: cap 300, refill 5/s — el límite
// real documentado por ArenaNet es por IP, así que cada proceso que corre en
// su propia IP necesita el suyo.

const GW2_API_BASE = 'https://api.guildwars2.com/v2'
const ITEMS_CHUNK_SIZE = 200

class TokenBucket {
  private tokens: number
  private lastRefill = Date.now()

  constructor(private capacity: number, private refillPerSecond: number) {
    this.tokens = capacity
  }

  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond)
    this.lastRefill = now
  }

  async acquire() {
    for (;;) {
      this.refill()
      if (this.tokens >= 1) {
        this.tokens -= 1
        return
      }
      const waitMs = ((1 - this.tokens) / this.refillPerSecond) * 1000
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 10)))
    }
  }
}

const bucket = new TokenBucket(300, 5)

async function gw2Fetch<T>(path: string, params?: Record<string, string>, attempt = 1): Promise<T> {
  await bucket.acquire()

  const url = new URL(`${GW2_API_BASE}${path}`)
  if (params) for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  // 429 (rate limit) o 5xx transitorio: un par de reintentos con backoff antes
  // de tirar el error — la API de GW2 es propensa a hipos puntuales.
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    return gw2Fetch<T>(path, params, attempt + 1)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GW2 API ${res.status} en ${path}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<T>
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export interface Gw2ApiItem {
  id: number
  name: string
  icon?: string
  description?: string
  type: string
  rarity: string
  level: number
  vendor_value: number
  flags: string[]
  restrictions: string[]
  chat_link: string
  details?: Record<string, unknown>
}

/**
 * IDs de todos los ítems actualmente listables en el Trading Post — el
 * universo "tradeable" real, mucho más chico que /v2/items completo (que
 * incluye ítems no comerciables, cosméticos de logro, etc).
 */
export async function getTradeableItemIds(): Promise<number[]> {
  return gw2Fetch<number[]>('/commerce/prices')
}

/** Metadata completa de ítems por lotes de hasta 200 ids. */
export async function getItemsByIds(ids: number[]): Promise<Gw2ApiItem[]> {
  const out: Gw2ApiItem[] = []
  for (const batch of chunk(ids, ITEMS_CHUNK_SIZE)) {
    out.push(...(await gw2Fetch<Gw2ApiItem[]>('/items', { ids: batch.join(',') })))
  }
  return out
}

export interface Gw2Price {
  id: number
  whitelisted: boolean
  buys: { quantity: number; unit_price: number }
  sells: { quantity: number; unit_price: number }
}

/** Best bid/ask por ítem (liviano) — usado por Refinamiento y el Extractor. */
export async function getPricesByIds(ids: number[]): Promise<Gw2Price[]> {
  const out: Gw2Price[] = []
  for (const batch of chunk(ids, ITEMS_CHUNK_SIZE)) {
    out.push(...(await gw2Fetch<Gw2Price[]>('/commerce/prices', { ids: batch.join(',') })))
  }
  return out
}

export interface Gw2Listing {
  id: number
  buys: { listings: number; unit_price: number; quantity: number }[]
  sells: { listings: number; unit_price: number; quantity: number }[]
}

/** Order book completo (con profundidad) por ítem — lo usará el Colector en la Fase 2. */
export async function getListingsByIds(ids: number[]): Promise<Gw2Listing[]> {
  const out: Gw2Listing[] = []
  for (const batch of chunk(ids, ITEMS_CHUNK_SIZE)) {
    out.push(...(await gw2Fetch<Gw2Listing[]>('/commerce/listings', { ids: batch.join(',') })))
  }
  return out
}
