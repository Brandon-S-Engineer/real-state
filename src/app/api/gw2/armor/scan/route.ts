import { runArmorScan } from '@/lib/gw2/armor-score'
import { startScan, getScanState } from '@/lib/gw2/scan-runner'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST() {
  const started = startScan('armor', runArmorScan)
  return NextResponse.json({ started, running: getScanState('armor').running })
}

export async function GET() {
  const state = getScanState('armor')
  const last = await prisma.gw2ArmorOpportunity.findFirst({ orderBy: { computedAt: 'desc' }, select: { computedAt: true } })
  return NextResponse.json({ running: state.running, lastComputedAt: last?.computedAt ?? null, error: state.error })
}
