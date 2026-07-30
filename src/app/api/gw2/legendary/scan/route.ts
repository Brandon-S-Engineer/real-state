import { runLegendaryScan } from '@/lib/gw2/legendary-scan'
import { startScan, getScanState } from '@/lib/gw2/scan-runner'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST() {
  const started = startScan('legendary', runLegendaryScan)
  return NextResponse.json({ started, running: getScanState('legendary').running })
}

export async function GET() {
  const state = getScanState('legendary')
  const last = await prisma.gw2LegendaryOpportunity.findFirst({ orderBy: { computedAt: 'desc' }, select: { computedAt: true } })
  return NextResponse.json({ running: state.running, lastComputedAt: last?.computedAt ?? null, error: state.error })
}
