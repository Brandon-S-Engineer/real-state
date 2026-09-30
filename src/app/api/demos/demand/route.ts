import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { refreshDemand } from '@/lib/demos/server'

// Toma un snapshot de demanda semanal desde los jobs capturados ahora mismo.
export async function POST() {
  const error = await requireAdmin()
  if (error) return error
  await refreshDemand()
  return NextResponse.json({ ok: true })
}
