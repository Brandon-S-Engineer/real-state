import { notFound } from 'next/navigation'
import { getInstrumento } from '@/content/trading-instruments'
import { getCobertura } from '@/lib/trading/bars'
import ChartClient, { type ChartInit } from '@/components/trading/chart-client'

export const dynamic = 'force-dynamic'

export default async function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const inst = getInstrumento(symbol)
  if (!inst) notFound()

  const cob = await getCobertura(inst.symbol)

  const init: ChartInit = {
    symbol: inst.symbol,
    nombre: inst.nombre,
    digits: inst.digits,
    clase: inst.clase,
    tesis: inst.tesis,
    m1Desde: inst.m1Desde,
    historialDudoso: !!inst.historialDudoso,
    velasEnDisco: cob?.velas ?? 0,
  }

  return <ChartClient init={init} />
}
