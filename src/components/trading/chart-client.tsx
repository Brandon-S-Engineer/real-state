'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import CandleChart from '@/components/trading/candle-chart'
import { OVERLAYS, type OverlayKey } from '@/lib/trading/indicators'
import { TIMEFRAMES, type Timeframe } from '@/content/trading-instruments'
import type { Bar } from '@/lib/trading/bars'

const TF_LABEL: Record<Timeframe, string> = { m1: '1m', m5: '5m', m15: '15m', m30: '30m', h1: '1h', h4: '4h', d1: '1D' }

/** Cuántas velas traer por temporalidad — suficiente contexto sin ahogar la UI. */
const TF_LIMIT: Record<Timeframe, number> = { m1: 4000, m5: 4000, m15: 3000, m30: 3000, h1: 3000, h4: 2500, d1: 2500 }

export type ChartInit = {
  symbol: string
  nombre: string
  digits: number
  clase: string
  tesis: string
  m1Desde: string
  historialDudoso: boolean
  velasEnDisco: number
}

export default function ChartClient({ init }: { init: ChartInit }) {
  const router = useRouter()
  const [tf, setTf] = useState<Timeframe>('h1')
  const [bars, setBars] = useState<Bar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overlays, setOverlays] = useState<OverlayKey[]>(['ema20', 'ema50'])

  useEffect(() => {
    let vivo = true
    setLoading(true)
    setError(null)
    fetch(`/api/trading/bars?symbol=${encodeURIComponent(init.symbol)}&tf=${tf}&limit=${TF_LIMIT[tf]}`)
      .then(async (r) => {
        const j = await r.json()
        if (!vivo) return
        if (!r.ok) {
          setError(typeof j.error === 'string' ? j.error : 'No se pudieron cargar las velas')
          setBars([])
          return
        }
        setBars(j.bars ?? [])
      })
      .catch(() => vivo && setError('Fallo de red al pedir las velas'))
      .finally(() => vivo && setLoading(false))
    return () => {
      vivo = false
    }
  }, [init.symbol, tf])

  // El formato del eje depende de la temporalidad: en 1m la fecha sobra, en
  // diario la hora sobra.
  const formatTime = useCallback(
    (t: number) => {
      const d = new Date(t)
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const hh = String(d.getUTCHours()).padStart(2, '0')
      const mi = String(d.getUTCMinutes()).padStart(2, '0')
      if (tf === 'd1') return `${dd}/${mm}/${String(d.getUTCFullYear()).slice(2)}`
      if (tf === 'h4' || tf === 'h1') return `${dd}/${mm} ${hh}h`
      return `${dd}/${mm} ${hh}:${mi}`
    },
    [tf],
  )

  const ultima = bars.length ? bars[bars.length - 1] : null
  const cambio = useMemo(() => {
    if (bars.length < 2) return null
    const a = bars[bars.length - 2].c
    const b = bars[bars.length - 1].c
    return { abs: b - a, pct: a ? (b - a) / a : 0 }
  }, [bars])

  const toggleOverlay = (k: OverlayKey) => setOverlays((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  return (
    <div className='p-6 space-y-4'>
      <button onClick={() => router.push('/trading')} className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'>
        <ArrowLeft className='h-3 w-3' /> Mercados
      </button>

      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-xl font-semibold'>{init.symbol}</h1>
            <span className='text-sm text-muted-foreground'>{init.nombre}</span>
            {ultima && (
              <>
                <span className='text-xl font-semibold tabular-nums'>{ultima.c.toFixed(init.digits)}</span>
                {cambio && (
                  <span className={`text-sm tabular-nums ${cambio.abs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {cambio.abs >= 0 ? '+' : ''}
                    {cambio.abs.toFixed(init.digits)} ({cambio.abs >= 0 ? '+' : ''}
                    {(cambio.pct * 100).toFixed(2)}%)
                  </span>
                )}
              </>
            )}
          </div>
          <p className='text-xs text-muted-foreground mt-1 max-w-2xl leading-snug'>{init.tesis}</p>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-1'>
            {OVERLAYS.map((o) => (
              <button
                key={o.key}
                onClick={() => toggleOverlay(o.key)}
                className={`px-2 py-1 rounded-md text-xs transition-colors border ${
                  overlays.includes(o.key) ? 'border-transparent text-background' : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                style={overlays.includes(o.key) ? { backgroundColor: o.color } : undefined}>
                {o.label}
              </button>
            ))}
          </div>
          <div className='flex items-center gap-1'>
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  tf === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                }`}>
                {TF_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='rounded-xl border p-2'>
        {loading ? (
          <div className='flex items-center gap-2 justify-center text-sm text-muted-foreground' style={{ height: 460 }}>
            <Loader2 className='h-4 w-4 animate-spin' /> Cargando velas…
          </div>
        ) : error ? (
          <div className='flex items-center justify-center text-sm text-destructive' style={{ height: 460 }}>
            {error}
          </div>
        ) : bars.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground text-center px-6' style={{ height: 460 }}>
            <p>No hay velas descargadas de {init.symbol} todavía.</p>
            <code className='text-[11px] bg-muted px-2 py-1 rounded'>
              npm run trading:fetch -- --symbol {init.symbol} --from {new Date(init.m1Desde).getUTCFullYear()}
            </code>
          </div>
        ) : (
          <CandleChart bars={bars} digits={init.digits} overlays={overlays} formatTime={formatTime} />
        )}
      </div>

      <p className='text-[11px] text-muted-foreground'>
        Todas las temporalidades se derivan del M1 en disco (verificado: el diario resampleado coincide al decimal con el diario nativo de
        Dukascopy). Horas en UTC. {init.velasEnDisco.toLocaleString('es-MX')} velas M1 guardadas.
        {init.historialDudoso && ' El historial declarado por Dukascopy para este instrumento no es de fiar antes de 2017.'}
      </p>
    </div>
  )
}
