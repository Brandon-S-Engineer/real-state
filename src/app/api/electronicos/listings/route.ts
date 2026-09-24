// ── Captura de listings (MacBooks) desde la extensión `marketplace/` ─────────
//
// POST: la extensión manda el lote crudo; el servidor parsea specs, asigna zona,
//       deduplica por externalId y calcula el score. Sesión NextAuth o API key.
// GET:  listado para el dashboard (polling de alertas).
// DELETE: purga para recalibrar — conserva comprados y los ligados a un trade.

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireSessionOrApiKey, CORS_HEADERS, corsOk } from '@/lib/api-auth'
import { requireAdmin } from '@/lib/require-admin'
import { ingestListings, ingestSchema } from '@/lib/electronicos/ingest'
import { toListingDTO } from '@/lib/electronicos/serialize'

export function OPTIONS() {
  return corsOk()
}

export async function POST(req: Request) {
  const authError = await requireSessionOrApiKey(req)
  if (authError) {
    authError.headers.set('Access-Control-Allow-Origin', '*')
    return authError
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS_HEADERS })
  }

  const parsed = ingestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS })
  }

  const result = await ingestListings(parsed.data)
  return NextResponse.json(result, { status: 201, headers: CORS_HEADERS })
}

export async function GET(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')
  const rows = await prisma.elecListing.findMany({
    where: since ? { updatedAt: { gte: new Date(since) } } : {},
    include: { zone: true },
    orderBy: { lastSeenAt: 'desc' },
    take: 2000,
  })
  return NextResponse.json({ data: rows.map(toListingDTO) })
}

export async function DELETE() {
  const error = await requireAdmin()
  if (error) return error

  const { count } = await prisma.elecListing.deleteMany({ where: { comprado: false, trade: null } })
  await prisma.elecCaptureSession.deleteMany({})
  const kept = await prisma.elecListing.count()
  return NextResponse.json({ ok: true, deleted: count, kept })
}
