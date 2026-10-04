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
import { parseCategory } from '@/lib/electronicos/categories'
import { LISTINGS_LIMIT } from '@/lib/electronicos/stats'

function categoryParam(req: Request) {
  return parseCategory(new URL(req.url).searchParams.get('category'))
}

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

  const since = new URL(req.url).searchParams.get('since')
  const category = categoryParam(req)
  const rows = await prisma.elecListing.findMany({
    where: { ...(since ? { updatedAt: { gte: new Date(since) } } : {}), ...(category ? { category } : {}) },
    include: { zone: true },
    orderBy: { lastSeenAt: 'desc' },
    take: LISTINGS_LIMIT,
  })
  return NextResponse.json({ data: rows.map(toListingDTO) })
}

export async function DELETE(req: Request) {
  const error = await requireAdmin()
  if (error) return error

  const category = categoryParam(req)
  const { count } = await prisma.elecListing.deleteMany({ where: { comprado: false, trade: null, ...(category ? { category } : {}) } })
  // Las sesiones no tienen categoría; solo se limpian al purgar todo
  if (!category) await prisma.elecCaptureSession.deleteMany({})
  const kept = await prisma.elecListing.count({ where: category ? { category } : {} })
  return NextResponse.json({ ok: true, deleted: count, kept })
}
