import { runRefinementScan } from '@/lib/gw2/refinement-scan'
import { startScan, getScanState } from '@/lib/gw2/scan-runner'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST() {
  const started = startScan('refinement', runRefinementScan)
  return NextResponse.json({ started, running: getScanState('refinement').running })
}

export async function GET() {
  const state = getScanState('refinement')
  const last = await prisma.gw2RefinementOpportunity.findFirst({ orderBy: { computedAt: 'desc' }, select: { computedAt: true } })
  return NextResponse.json({ running: state.running, lastComputedAt: last?.computedAt ?? null, error: state.error })
}
