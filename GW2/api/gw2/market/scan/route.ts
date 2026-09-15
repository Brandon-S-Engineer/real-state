import { runMarketScan } from '@/lib/gw2/market-scan'
import { startScan, getScanState } from '@/lib/gw2/scan-runner'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const maxDuration = 300

// POST: arranca el scan en segundo plano y responde al instante (no bloquea la UI).
export async function POST() {
  const started = startScan('market', runMarketScan)
  return NextResponse.json({ started, running: getScanState('market').running })
}

// GET: estado del scan para que la UI sepa cuándo terminó (sin bloquear).
export async function GET() {
  const state = getScanState('market')
  const last = await prisma.gw2MarketOpportunity.findFirst({ orderBy: { computedAt: 'desc' }, select: { computedAt: true } })
  return NextResponse.json({ running: state.running, lastComputedAt: last?.computedAt ?? null, error: state.error })
}
