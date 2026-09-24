import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { reparseAndRescoreAll } from '@/lib/electronicos/ingest'

// Re-parsea specs (respeta correcciones manuales), reasigna zonas, barre
// desaparecidos y recalcula todos los scores.
export async function POST() {
  const error = await requireAdmin()
  if (error) return error
  const result = await reparseAndRescoreAll()
  return NextResponse.json({ ok: true, ...result })
}
