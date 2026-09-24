// DTOs serializables (fechas → ISO) compartidos entre server components y API.

import type { ElecListing, ElecTrade, ElecZone } from '@prisma/client'
import type { SpecFlags } from './parse-specs'
import type { ScoreReason } from './stats'

export type ElecListingDTO = Omit<ElecListing,
  'flags' | 'scoreReasons' | 'postedAt' | 'firstSeenAt' | 'lastSeenAt' | 'disappearedAt' | 'compradoAt' | 'createdAt' | 'updatedAt'> & {
  flags: SpecFlags
  scoreReasons: ScoreReason[]
  postedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
  disappearedAt: string | null
  compradoAt: string | null
  createdAt: string
  zoneName: string | null
}

export function toListingDTO(l: ElecListing & { zone?: ElecZone | null }): ElecListingDTO {
  const { zone, ...rest } = l
  return {
    ...rest,
    flags: (l.flags ?? {}) as SpecFlags,
    scoreReasons: Array.isArray(l.scoreReasons) ? (l.scoreReasons as ScoreReason[]) : [],
    postedAt: l.postedAt?.toISOString() ?? null,
    firstSeenAt: l.firstSeenAt.toISOString(),
    lastSeenAt: l.lastSeenAt.toISOString(),
    disappearedAt: l.disappearedAt?.toISOString() ?? null,
    compradoAt: l.compradoAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    zoneName: zone?.name ?? null,
  }
}

export type ElecZoneDTO = Omit<ElecZone, 'keywords' | 'createdAt' | 'updatedAt'> & { keywords: string[] }

export function toZoneDTO(z: ElecZone): ElecZoneDTO {
  const { createdAt: _c, updatedAt: _u, ...rest } = z
  return { ...rest, keywords: Array.isArray(z.keywords) ? (z.keywords as string[]) : [] }
}

export type ElecTradeDTO = Omit<ElecTrade, 'buyDate' | 'sellDate' | 'createdAt' | 'updatedAt'> & {
  buyDate: string
  sellDate: string | null
  profit: number | null // venta − compra − costos
  daysInInventory: number | null
  listingTitle: string | null
  listingUrl: string | null
}

export function toTradeDTO(t: ElecTrade & { listing?: { title: string; url: string } | null }): ElecTradeDTO {
  const { listing, createdAt: _c, updatedAt: _u, ...rest } = t
  const end = t.sellDate ?? new Date()
  return {
    ...rest,
    buyDate: t.buyDate.toISOString(),
    sellDate: t.sellDate?.toISOString() ?? null,
    profit: t.sellPrice != null ? t.sellPrice - t.buyPrice - t.costs : null,
    daysInInventory: Math.max(0, Math.round((end.getTime() - t.buyDate.getTime()) / 86_400_000)),
    listingTitle: listing?.title ?? null,
    listingUrl: listing?.url ?? null,
  }
}
