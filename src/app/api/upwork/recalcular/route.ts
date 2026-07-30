import { requireAdmin } from '@/lib/require-admin'
import { NextResponse } from 'next/server'
import { recalcularUpworkScores } from '@/lib/upwork-score'

export async function POST() {
  const error = await requireAdmin()
  if (error) return error

  const result = await recalcularUpworkScores()
  return NextResponse.json({ ok: true, ...result })
}
