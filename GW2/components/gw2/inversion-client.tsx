'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Sparkline } from '@/components/dashboard/charts'
import { formatCopper, formatPercent } from '@/lib/gw2/format'
import type { InvestStat, InvestSignal } from '@/lib/gw2/investment-analysis'
import type { WeeklyStat } from '@/lib/gw2/weekly-cycle'
import { WeekBars, ConsistencyDot } from '@/components/gw2/week-bars'

export type InvestRow = {
  itemId: number
  name: string
  icon: string | null
  category: string
  thesis: string
  currentAsk: number
  currentBid: number
  stat: InvestStat | null
}

export type WeeklyRow = {
  itemId: number
  name: string
  icon: string | null
  note: string
  currentBid: number
  stat: WeeklyStat | null
}

const SIGNAL_STYLE: Record<InvestSignal, string> = {
  comprar: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  esperar: 'bg-muted text-muted-foreground',
  vender: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}
const SIGNAL_LABEL: Record<InvestSignal, string> = { comprar: 'Comprar', esperar: 'Esperar', vender: 'Vender' }

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-8 w-8 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={32} height={32} className='h-8 w-8 rounded shrink-0' loading='lazy' />
}

function Trend({ pct }: { pct: number }) {
  const up = pct > 0.03
  const down = pct < -0.03
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  const color = up ? 'text-emerald-600 dark:text-emerald-400' : down ? 'text-red-500' : 'text-muted-foreground'
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${color}`}>
      <Icon className='h-3.5 w-3.5' /> {pct >= 0 ? '+' : ''}{(pct * 100).toFixed(0)}%
    </span>
  )
}

export default function InversionClient({ rows, weekly }: { rows: InvestRow[]; weekly: WeeklyRow[] }) {
  const router = useRouter()
  const buys = useMemo(() => rows.filter((r) => r.stat?.signal === 'comprar'), [rows])

  return (
    <div className='p-6 space-y-5 max-w-[1100px]'>
      <div className='max-w-3xl'>
        <h1 className='text-lg font-semibold'>Bóveda — inversión a largo plazo</h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          El oro de barón pesado no sale de flipear commodities — sale de <strong>parquear capital en activos duros</strong> (Mystic Coins, ectos, mats T6, dust) y aguantar. Tu motor de amarillos genera el capital; esto lo multiplica. La jugada: comprar cada activo cuando está <strong>barato vs su propia historia de años</strong>, guardar, y vender en el pico del ciclo (o craftear legendarias). Rankeado por lo más barato relativo a su historia.
        </p>
      </div>

      {buys.length > 0 ? (
        <div className='rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 px-4 py-3'>
          <div className='text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-medium mb-1.5'>Comprá ahora — en su dip</div>
          <div className='flex flex-wrap gap-2'>
            {buys.map((r) => (
              <button key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-sm hover:bg-muted/50 transition-colors'>
                <ItemIcon src={r.icon} alt={r.name} />
                <span className='font-medium'>{r.name}</span>
                {r.stat && <span className='text-xs text-emerald-600 dark:text-emerald-400 tabular-nums'>−{formatPercent(r.stat.drawdown)} de su máx</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className='rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
          Ahora nada está en su dip — casi todo cotiza cerca de su pico reciente. Es momento de <strong>esperar</strong> (o vender lo que tengas en el pico). Los mats T6 suelen desplomarse cuando un festival inunda la oferta — ahí saltan a «Comprar». Vigilá esta pestaña cerca de los eventos.
        </div>
      )}

      <div className='rounded-xl border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide'>
              <th className='text-left px-3 py-2.5 font-medium'>Activo</th>
              <th className='text-right px-4 py-2.5 font-medium'>Precio actual</th>
              <th className='text-left px-4 py-2.5 font-medium'>Historial 2 años</th>
              <th className='text-right px-4 py-2.5 font-medium whitespace-nowrap'>vs máx reciente</th>
              <th className='text-right px-4 py-2.5 font-medium'>Tendencia</th>
              <th className='text-right px-4 py-2.5 font-medium'>Señal</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {rows.map((r) => {
              const s = r.stat
              const buy = s?.signal === 'comprar'
              return (
                <tr key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className={`hover:bg-muted/40 cursor-pointer align-top ${buy ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                  <td className='px-3 py-3'>
                    <div className='flex items-start gap-2.5'>
                      <ItemIcon src={r.icon} alt={r.name} />
                      <div className='min-w-0'>
                        <div className='font-medium'>{r.name}</div>
                        <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>{r.category}</div>
                        <div className='text-xs text-muted-foreground mt-0.5 max-w-md leading-snug'>{r.thesis}</div>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-right tabular-nums whitespace-nowrap'>
                    <div className='font-medium'>{formatCopper(r.currentAsk)}</div>
                    {s && <div className='text-[10px] text-muted-foreground'>media {formatCopper(Math.round(s.avg1y))}</div>}
                  </td>
                  <td className='px-4 py-3'>
                    {s && s.spark.length > 3 ? (
                      <div>
                        <Sparkline data={s.spark} stroke={s.trend2yPct >= 0 ? '#2a78d6' : '#eb6834'} width={130} height={30} />
                        <div className='text-[10px] text-muted-foreground tabular-nums'>rango 120d {formatCopper(s.minRecent)} – {formatCopper(s.maxRecent)}</div>
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>sin historial</span>
                    )}
                  </td>
                  <td className='px-4 py-3 text-right tabular-nums whitespace-nowrap'>
                    {s ? (
                      <>
                        <div className={s.drawdown >= 0.05 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>−{formatPercent(s.drawdown)}</div>
                        <div className='text-[10px] text-muted-foreground'>percentil {(s.pctRecent * 100).toFixed(0)}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>{s ? <Trend pct={s.trend2yPct} /> : '—'}</td>
                  <td className='px-4 py-3 text-right'>
                    {s ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${SIGNAL_STYLE[s.signal]}`}>{SIGNAL_LABEL[s.signal]}</span> : <span className='text-[10px] text-muted-foreground'>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className='text-xs text-muted-foreground'>
        Precios en vivo; historial diario multi-año (DataWars2). «vs máx reciente» = cuánto cayó desde su pico de los últimos ~120 días (más = más hundido = mejor entrada); «percentil» = qué fracción de esa ventana estuvo más barato. «Tendencia» = apreciación a 2 años (¿vale aguantarlo?). Señal <strong>Comprar</strong> = en un dip real de un activo que no se está desplomando; <strong>Vender</strong> = cerca de su pico si viene apreciándose. No es flip rápido: es acumular en el dip y aguantar meses.
      </p>

      {/* ── Ciclo semanal ─────────────────────────────────────────────── */}
      <div className='pt-4 border-t space-y-3'>
        <div className='max-w-3xl'>
          <h2 className='text-base font-semibold'>Ciclo semanal — comprá el día de sobreoferta</h2>
          <p className='text-sm text-muted-foreground mt-0.5'>
            El finde los casuales inundan la oferta y hunden el precio; entre semana los comprometidos siguen demandando y lo suben. Estas barras miden el patrón <strong>real</strong> de ~2 años por día de la semana (quitando la tendencia larga). La jugada: comprar miles por orden el <span className='text-emerald-600 dark:text-emerald-400 font-medium'>día barato</span> y postear/procesar la salida el <span className='text-amber-600 dark:text-amber-500 font-medium'>día caro</span>. Ordenado por lo más abusable (spread × consistencia).
          </p>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {weekly.map((r) => {
            const s = r.stat
            return (
              <div key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='rounded-xl border p-3 hover:bg-muted/40 cursor-pointer'>
                <div className='flex items-start gap-2.5'>
                  <ItemIcon src={r.icon} alt={r.name} />
                  <div className='min-w-0 flex-1'>
                    <div className='font-medium text-sm leading-tight'>{r.name}</div>
                    {s ? (
                      <div className='text-xs text-muted-foreground mt-0.5'>
                        Comprá <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>{s.cheapestLabel}</span>, vendé <span className='text-amber-600 dark:text-amber-500 font-semibold'>{s.richestLabel}</span>
                      </div>
                    ) : (
                      <div className='text-xs text-muted-foreground mt-0.5'>sin historial suficiente</div>
                    )}
                  </div>
                </div>

                {s ? (
                  <>
                    <div className='mt-2'><WeekBars stat={s} /></div>
                    <div className='mt-2 flex items-center justify-between text-xs'>
                      <span className='tabular-nums'>
                        edge <span className='font-semibold text-foreground'>{(s.spreadPct * 100).toFixed(2)}%</span>
                      </span>
                      <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
                        <ConsistencyDot v={s.consistency} />
                        {(s.consistency * 100).toFixed(0)}% de {s.weeks} semanas
                      </span>
                    </div>
                    <p className='text-[11px] text-muted-foreground mt-1.5 leading-snug'>{r.note}</p>
                  </>
                ) : (
                  <p className='text-[11px] text-muted-foreground mt-2 leading-snug'>{r.note}</p>
                )}
              </div>
            )
          })}
        </div>

        <p className='text-xs text-muted-foreground max-w-3xl'>
          «edge» = diferencia entre el día más caro y el más barato de la semana, como % del precio (el máximo que capturás por timing puro). «consistencia» = en qué fracción de las semanas el día barato estuvo de verdad por debajo del promedio de esa semana — <strong>un edge grande pero inconsistente es ruido</strong>; verde ≥65% es confiable, rojo &lt;55% no lo tomes en serio. El ciclo semanal suma sobre el hold largo: acumulás el activo más barato de lo que tocaría, y encima aprecia.
        </p>
      </div>
    </div>
  )
}
