import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { recalcularDealScores } from '@/lib/deal-score'

export async function POST() {
  const error = await requireAdmin()
  if (error) return error

  const result = await recalcularDealScores()
  return NextResponse.json({ ok: true, ...result })
}
