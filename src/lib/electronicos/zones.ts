// ── Mapeo de ubicación → zona propia (COMPRA / VENTA / OTRA) ──────────────────
//
// Dos señales, en orden de precisión:
//   1. Coordenadas (lat/lng) — la página de item de Marketplace trae el centro
//      del mapa aproximado. Si cae dentro del radio de una zona, gana esa zona.
//   2. Texto — Marketplace solo dice el municipio ("Cuajimalpa de Morelos, CDMX")
//      y los grupos dicen lo que quieran. Se matchea contra keywords de la zona.
//
// Nota: "Álvaro Obregón" NO está en las keywords de Santa Fe a propósito: el
// municipio es enorme (San Ángel, Mixcoac…). Santa Fe solo se asigna por coords
// o si el texto dice "santa fe" / "cuajimalpa".

import { prisma } from '@/lib/db'
import type { ElecZone } from '@prisma/client'
import { normalizeText } from './parse-specs'

export const DEFAULT_ZONES = [
  {
    name: 'Centro CDMX', kind: 'COMPRA' as const, lat: 19.4326, lng: -99.1332, radiusKm: 3,
    keywords: ['cuauhtemoc', 'centro historico', 'centro cdmx', 'doctores', 'guerrero', 'tepito', 'republica de el salvador', 'eje central'],
  },
  {
    name: 'Santa Fe', kind: 'VENTA' as const, lat: 19.3597, lng: -99.2595, radiusKm: 4,
    keywords: ['santa fe', 'cuajimalpa', 'cuajimalpa de morelos'],
  },
  {
    name: 'Interlomas', kind: 'VENTA' as const, lat: 19.3966, lng: -99.2811, radiusKm: 4,
    keywords: ['interlomas', 'huixquilucan', 'bosque real'],
  },
  {
    name: 'Polanco', kind: 'VENTA' as const, lat: 19.433, lng: -99.195, radiusKm: 3.5,
    keywords: ['polanco', 'miguel hidalgo', 'lomas de chapultepec', 'anzures'],
  },
  {
    name: 'Toluca', kind: 'VENTA' as const, lat: 19.2826, lng: -99.6557, radiusKm: 12,
    keywords: ['toluca', 'metepec', 'zinacantepec'],
  },
  {
    name: 'Benito Juárez', kind: 'VENTA' as const, lat: 19.3781, lng: -99.1620, radiusKm: 4,
    keywords: ['benito juarez', 'del valle', 'napoles', 'ciudad de los deportes', 'nochebuena', 'portales', 'narvarte'],
  },
]

/** Crea las zonas por defecto la primera vez (config, no datos de prueba). */
export async function ensureDefaultZones(): Promise<ElecZone[]> {
  const existing = await prisma.elecZone.findMany({ orderBy: { createdAt: 'asc' } })
  if (existing.length) return existing
  await prisma.elecZone.createMany({ data: DEFAULT_ZONES, skipDuplicates: true })
  return prisma.elecZone.findMany({ orderBy: { createdAt: 'asc' } })
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function matchZone(
  zones: ElecZone[],
  input: { locationText?: string | null; lat?: number | null; lng?: number | null; text?: string | null },
): ElecZone | null {
  const active = zones.filter((z) => z.active)

  if (input.lat != null && input.lng != null) {
    let best: { zone: ElecZone; d: number } | null = null
    for (const z of active) {
      if (z.lat == null || z.lng == null || !z.radiusKm) continue
      const d = haversineKm(input.lat, input.lng, z.lat, z.lng)
      if (d <= z.radiusKm && (!best || d < best.d)) best = { zone: z, d }
    }
    if (best) return best.zone
  }

  // Ubicación explícita primero; el texto del post solo como último recurso
  for (const raw of [input.locationText, input.text]) {
    if (!raw) continue
    const t = normalizeText(raw)
    let best: { zone: ElecZone; len: number } | null = null
    for (const z of active) {
      for (const kw of (z.keywords as string[]) ?? []) {
        const k = normalizeText(kw)
        if (k && new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t) && (!best || k.length > best.len)) {
          best = { zone: z, len: k.length }
        }
      }
    }
    if (best) return best.zone
  }
  return null
}
