// ── Ingesta de listings desde la extensión ───────────────────────────────────
//
// La extensión manda lo crudo (título, precio, ubicación…). Aquí se parsean
// specs, se asigna zona, se upsertea por externalId, se registra historial de
// precio y se marca DESAPARECIDO lo que dejó de verse.

import { prisma } from '@/lib/db'
import { Prisma, type ElecListing, type ElecSettings, type ElecZone } from '@prisma/client'
import { z } from 'zod'
import { parseSpecs, parsePriceFromText } from './parse-specs'
import { ensureDefaultZones, matchZone } from './zones'
import { getElecSettings, indexGroups, loadWindowRows, scoreListing } from './stats'

export const listingInputSchema = z.object({
  externalId: z.string().min(1),
  url: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  condition: z.string().nullish(),
  price: z.number().nullish(),
  originalPrice: z.number().nullish(),
  imageUrl: z.string().nullish(),
  locationText: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  sellerName: z.string().nullish(),
  sellerId: z.string().nullish(),
  postedText: z.string().nullish(),
  postedAt: z.number().nullish(), // epoch ms
  soldHint: z.boolean().optional(), // FB dice "Sold"/"no disponible"
})

export const ingestSchema = z.object({
  source: z.enum(['MARKETPLACE', 'FB_GROUP']),
  sourceKey: z.string().min(1),
  sourceName: z.string().min(1),
  // true cuando el lote viene de "ver una fuente" (búsqueda/grupo); cuenta como
  // sesión para la lógica de desaparecidos. false para capturas de detalle.
  countsAsSession: z.boolean().default(true),
  listings: z.array(listingInputSchema).max(200),
})

export type IngestInput = z.infer<typeof ingestSchema>

const SESSION_GAP_MS = 30 * 60_000
const DAY_MS = 86_400_000

async function touchSession(sourceKey: string, seen: number) {
  const recent = await prisma.elecCaptureSession.findFirst({
    where: { sourceKey, lastPingAt: { gte: new Date(Date.now() - SESSION_GAP_MS) } },
    orderBy: { lastPingAt: 'desc' },
  })
  if (recent) {
    await prisma.elecCaptureSession.update({
      where: { id: recent.id },
      data: { lastPingAt: new Date(), seenCount: { increment: seen } },
    })
  } else {
    await prisma.elecCaptureSession.create({ data: { sourceKey, seenCount: seen } })
  }
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / DAY_MS) * 10) / 10)
}

/** Día calendario en CDMX, para contar sesiones "en días distintos". */
function mxDay(d: Date) {
  return new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 10)
}

/**
 * Marca DESAPARECIDO los listings de una fuente que no se han visto en
 * `disappearSessions` sesiones posteriores (en días distintos) y llevan más de
 * `disappearMinHours` sin verse. Solo aplica a Marketplace: los posts de grupos
 * no "desaparecen" al venderse (se editan a "vendido", eso lo detecta el parser).
 */
export async function sweepDisappeared(settings: ElecSettings, sourceKey?: string): Promise<number> {
  const cutoff = new Date(Date.now() - settings.disappearMinHours * 3_600_000)
  const candidates = await prisma.elecListing.findMany({
    where: {
      status: 'ACTIVO',
      source: 'MARKETPLACE',
      lastSeenAt: { lt: cutoff },
      ...(sourceKey ? { sourceKey } : {}),
    },
    select: { id: true, sourceKey: true, lastSeenAt: true, firstSeenAt: true, postedAt: true },
  })
  if (!candidates.length) return 0

  const keys = Array.from(new Set(candidates.map((c) => c.sourceKey)))
  const minSeen = new Date(Math.min(...candidates.map((c) => c.lastSeenAt.getTime())))
  const sessions = await prisma.elecCaptureSession.findMany({
    where: { sourceKey: { in: keys }, startedAt: { gt: minSeen } },
    select: { sourceKey: true, startedAt: true },
  })

  let marked = 0
  for (const c of candidates) {
    const days = new Set(
      sessions.filter((s) => s.sourceKey === c.sourceKey && s.startedAt > c.lastSeenAt).map((s) => mxDay(s.startedAt)),
    )
    if (days.size < settings.disappearSessions) continue
    await prisma.elecListing.update({
      where: { id: c.id },
      data: {
        status: 'DESAPARECIDO',
        disappearedAt: c.lastSeenAt,
        daysOnMarket: daysBetween(c.postedAt ?? c.firstSeenAt, c.lastSeenAt),
      },
    })
    marked++
  }
  return marked
}

export type IngestResult = {
  created: number
  updated: number
  skipped: number
  skippedReasons: Record<string, number>
  disappeared: number
  alertIds: string[]
}

export async function ingestListings(input: IngestInput): Promise<IngestResult> {
  const [settings, zones] = await Promise.all([getElecSettings(), ensureDefaultZones()])
  const result: IngestResult = { created: 0, updated: 0, skipped: 0, skippedReasons: {}, disappeared: 0, alertIds: [] }

  if (input.countsAsSession && input.listings.length) await touchSession(input.sourceKey, input.listings.length)

  const touched: ElecListing[] = []
  const newIds = new Set<string>()
  for (const raw of input.listings) {
    try {
      const out = await upsertOne(input, raw, zones)
      if (out.kind === 'skipped') {
        result.skipped++
        result.skippedReasons[out.reason] = (result.skippedReasons[out.reason] ?? 0) + 1
        continue
      }
      if (out.kind === 'created') { result.created++; newIds.add(out.listing.id) } else result.updated++
      touched.push(out.listing)
    } catch (err) {
      // Dos pestañas pueden mandar el mismo listing a la vez → colisión de unique
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') { result.updated++; continue }
      console.error(`elec ingest falló para ${raw.externalId}:`, err)
      result.skipped++
    }
  }

  // Score de lo recién tocado contra la foto actual del mercado
  if (touched.length) {
    const idx = indexGroups(await loadWindowRows(settings))
    for (const l of touched) {
      const { score, reasons } = scoreListing(l, idx, settings)
      await prisma.elecListing.update({ where: { id: l.id }, data: { opportunityScore: score, scoreReasons: reasons } })
      if (newIds.has(l.id) && score != null && score >= settings.minScoreAlert) result.alertIds.push(l.id)
    }
  }

  if (input.countsAsSession && input.source === 'MARKETPLACE') {
    result.disappeared = await sweepDisappeared(settings, input.sourceKey)
  }
  return result
}

type UpsertOut =
  | { kind: 'created' | 'updated'; listing: ElecListing }
  | { kind: 'skipped'; reason: string }

async function upsertOne(input: IngestInput, raw: z.infer<typeof listingInputSchema>, zones: ElecZone[]): Promise<UpsertOut> {
  const existing = await prisma.elecListing.findUnique({ where: { externalId: raw.externalId } })

  const title = raw.title.trim()
  const description = raw.description?.trim() || existing?.description || null
  const specs = parseSpecs(title, description)

  if (specs.excluded) {
    // Si ya lo teníamos y ahora (con descripción completa) resulta Intel/accesorio, fuera.
    if (existing && !existing.specsManual && !existing.comprado) {
      await prisma.elecListing.delete({ where: { id: existing.id } })
    }
    return { kind: 'skipped', reason: specs.excluded }
  }

  const price = raw.price ?? (input.source === 'FB_GROUP' ? parsePriceFromText(`${title}\n${description ?? ''}`) : null) ?? existing?.price ?? null
  const lat = raw.lat ?? existing?.lat ?? null
  const lng = raw.lng ?? existing?.lng ?? null
  const locationText = raw.locationText ?? existing?.locationText ?? null
  const zone = matchZone(zones, { locationText, lat, lng, text: input.source === 'FB_GROUP' ? `${title} ${description ?? ''}` : null })
  const now = new Date()

  const specData = existing?.specsManual
    ? {}
    : {
        line: specs.line, chip: specs.chip, ramGb: specs.ramGb, ssdGb: specs.ssdGb, year: specs.year,
        color: specs.color, batteryCycles: specs.batteryCycles, batteryHealth: specs.batteryHealth,
        flags: specs.flags as Prisma.InputJsonValue, parseConfidence: specs.parseConfidence,
        needsReview: specs.needsReview, configKey: specs.configKey,
        parseNotes: specs.notes.length ? specs.notes.join(' · ') : null,
      }

  const sold = raw.soldHint === true || specs.flags.vendido === true
  const common = {
    url: raw.url,
    source: input.source,
    sourceKey: input.countsAsSession ? input.sourceKey : existing?.sourceKey ?? input.sourceKey,
    sourceName: input.countsAsSession ? input.sourceName : existing?.sourceName ?? input.sourceName,
    title,
    description,
    condition: raw.condition ?? existing?.condition ?? null,
    price,
    originalPrice: raw.originalPrice ?? existing?.originalPrice ?? null,
    imageUrl: raw.imageUrl ?? existing?.imageUrl ?? null,
    locationText, lat, lng,
    zoneId: zone?.id ?? null,
    zoneKind: zone?.kind ?? 'OTRA',
    sellerName: raw.sellerName ?? existing?.sellerName ?? null,
    sellerId: raw.sellerId ?? existing?.sellerId ?? null,
    postedText: raw.postedText ?? existing?.postedText ?? null,
    lastSeenAt: now,
    ...specData,
  } as const

  if (!existing) {
    const postedAt = raw.postedAt ? new Date(raw.postedAt) : null
    const listing = await prisma.elecListing.create({
      data: {
        externalId: raw.externalId,
        ...common,
        postedAt,
        ...(sold ? { status: 'DESAPARECIDO', soldConfirmed: true, disappearedAt: now, daysOnMarket: postedAt ? daysBetween(postedAt, now) : 0 } : {}),
        ...(price ? { priceHistory: { create: { price } } } : {}),
      },
    })
    return { kind: 'created', listing }
  }

  const statusData = sold
    ? existing.status === 'DESAPARECIDO' && existing.soldConfirmed
      ? {}
      : { status: 'DESAPARECIDO' as const, soldConfirmed: true, disappearedAt: now, daysOnMarket: daysBetween(existing.postedAt ?? existing.firstSeenAt, now) }
    : existing.status === 'DESAPARECIDO'
      // Reapareció: lo que creíamos vendido seguía ahí
      ? { status: 'ACTIVO' as const, disappearedAt: null, daysOnMarket: null, soldConfirmed: false }
      : {}

  const listing = await prisma.elecListing.update({
    where: { id: existing.id },
    data: {
      ...common,
      postedAt: existing.postedAt ?? (raw.postedAt ? new Date(raw.postedAt) : null),
      ...statusData,
      ...(price && price !== existing.price ? { priceHistory: { create: { price } } } : {}),
    },
  })
  return { kind: 'updated', listing }
}

/** Re-parsea (salvo correcciones manuales) y recalcula scores de todo. */
export async function reparseAndRescoreAll(): Promise<{ reparsed: number; scored: number; removed: number; disappeared: number }> {
  const [settings, zones] = await Promise.all([getElecSettings(), ensureDefaultZones()])
  const all = await prisma.elecListing.findMany()
  let reparsed = 0
  let removed = 0
  for (const l of all) {
    const zone = matchZone(zones, { locationText: l.locationText, lat: l.lat, lng: l.lng, text: l.source === 'FB_GROUP' ? `${l.title} ${l.description ?? ''}` : null })
    if (l.specsManual) {
      await prisma.elecListing.update({ where: { id: l.id }, data: { zoneId: zone?.id ?? null, zoneKind: zone?.kind ?? 'OTRA' } })
      continue
    }
    const s = parseSpecs(l.title, l.description)
    if (s.excluded && !l.comprado) {
      await prisma.elecListing.delete({ where: { id: l.id } })
      removed++
      continue
    }
    await prisma.elecListing.update({
      where: { id: l.id },
      data: {
        line: s.line, chip: s.chip, ramGb: s.ramGb, ssdGb: s.ssdGb, year: s.year, color: s.color,
        batteryCycles: s.batteryCycles, batteryHealth: s.batteryHealth, flags: s.flags as Prisma.InputJsonValue,
        parseConfidence: s.parseConfidence, needsReview: s.needsReview, configKey: s.configKey,
        parseNotes: s.notes.length ? s.notes.join(' · ') : null,
        zoneId: zone?.id ?? null, zoneKind: zone?.kind ?? 'OTRA',
      },
    })
    reparsed++
  }
  const disappeared = await sweepDisappeared(settings)
  const scored = await rescoreAll(settings)
  return { reparsed, scored, removed, disappeared }
}

export async function rescoreAll(settings?: ElecSettings): Promise<number> {
  const s = settings ?? (await getElecSettings())
  const idx = indexGroups(await loadWindowRows(s))
  const all = await prisma.elecListing.findMany()
  for (const l of all) {
    const { score, reasons } = scoreListing(l, idx, s)
    await prisma.elecListing.update({ where: { id: l.id }, data: { opportunityScore: score, scoreReasons: reasons } })
  }
  return all.length
}
