'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, LineChart, MapPin, PackageOpen, TrendingDown, TrendingUp, AlertTriangle, Target } from 'lucide-react'
import FavoriteStar from '@/components/gw2/favorite-star'
import { formatCopper } from '@/lib/gw2/format'
import type { EventEconomics } from '@/content/gw2-event-mechanics'
import type { FestivalPlay, FestivalYearCycle, BandVerdict, FestivalAction } from '@/lib/gw2/festival-cycle'

export type CycleView = {
  play: FestivalPlay
  festivalEffect: number
  medianNetRatio: number
  yearsPositive: number
  yearsTotal: number
  medianMonthsToPeak: number
  typicalSellMonth: number
  lastFestAvg: number
  band: BandVerdict | null
  years: FestivalYearCycle[]
  curve: { month: number; rel: number }[]
  action: FestivalAction | null
}

export type EventItemRow = {
  itemId: number
  name: string
  icon: string | null
  rarity: string
  type: string
  note: string | null
  bid: number
  ask: number
  spread: number
  spreadPct: number
  profitFlip: number
  supply: number
  demand: number
  cycle: CycleView | null
}

export type EventGroupView = {
  label: string
  note: string | null
  rows: EventItemRow[]
}

export type EventView = {
  slug: string
  name: string
  emoji: string
  location: string
  confirmed: boolean
  blurb: string
  strategy: string
  status: 'activo' | 'proximo' | 'terminado'
  daysUntilNext: number
  windowStart: string
  windowEnd: string
  nextStart: string
  itemCount: number
  groups: EventGroupView[]
  economics: EventEconomics | null
  buyPicks: EventItemRow[]
  sellPicks: EventItemRow[]
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
function fmtWindow(startISO: string, endISO: string) {
  const end = new Date(endISO)
  return `${fmtDay(startISO)} – ${fmtDay(endISO)} ${end.getFullYear()}`
}

const STATUS_DOT: Record<EventView['status'], string> = {
  activo: 'bg-emerald-500',
  proximo: 'bg-amber-500',
  terminado: 'bg-muted-foreground/40',
}

function StatusBadge({ ev }: { ev: EventView }) {
  if (ev.status === 'activo')
    return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'>Activo ahora</span>
  if (ev.status === 'proximo')
    return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'>En {ev.daysUntilNext} días</span>
  // Ya pasó este año: mostramos los días que faltan para la próxima ocurrencia (año siguiente), en gris.
  return <span className='px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground'>En {ev.daysUntilNext} días</span>
}

function ItemIcon({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className='h-9 w-9 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={36} height={36} className='h-9 w-9 rounded shrink-0' loading='lazy' />
}

const PLAY_STYLE: Record<FestivalPlay, string> = {
  'comprar-en-festival': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'vender-hacia-festival': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'sin-señal': 'bg-muted text-muted-foreground',
}
const PLAY_SHORT: Record<FestivalPlay, string> = {
  'comprar-en-festival': 'Comprar',
  'vender-hacia-festival': 'Vender',
  'sin-señal': '—',
}

const BAND_STYLE: Record<BandVerdict, string> = {
  barato: 'text-emerald-600 dark:text-emerald-400 font-medium',
  'en-banda': 'text-muted-foreground',
  caro: 'text-red-500',
}

/** Retorno neto mediano, con su nivel de confianza (en cuántos años funcionó). */
function CycleReturn({ c }: { c: CycleView }) {
  const good = c.medianNetRatio > 1.1
  const reliable = c.yearsPositive / c.yearsTotal >= 0.66
  return (
    <div className='text-right'>
      <div className={`tabular-nums ${good ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
        x{c.medianNetRatio.toFixed(2)}
      </div>
      <div className={`text-[10px] ${reliable ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'}`}>
        {c.yearsPositive}/{c.yearsTotal} años
      </div>
    </div>
  )
}

function EconomicsPanel({ econ }: { econ: EventEconomics }) {
  return (
    <div className='border-b bg-muted/10'>
      <div className='px-4 py-3 space-y-3'>
        <div>
          <div className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1'>La máquina del festival</div>
          <p className='text-sm leading-snug'>{econ.engine}</p>
        </div>

        <div className={`grid gap-2 ${econ.mechanics.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {econ.mechanics.map((m) => (
            <div key={m.container} className='rounded-lg border bg-background px-3 py-2.5'>
              <div className='flex items-center gap-1.5 font-medium text-sm'>
                <PackageOpen className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                {m.container}
              </div>
              <dl className='mt-1.5 space-y-1 text-xs leading-snug'>
                <div>
                  <dt className='inline text-muted-foreground'>Se consigue: </dt>
                  <dd className='inline'>{m.source}</dd>
                </div>
                <div>
                  <dt className='inline text-muted-foreground'>Suelta: </dt>
                  <dd className='inline'>{m.floods}</dd>
                </div>
                <div>
                  <dt className='inline text-muted-foreground'>Efecto: </dt>
                  <dd className='inline'>{m.effect}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div className='grid gap-2 sm:grid-cols-2'>
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 px-3 py-2.5'>
            <div className='flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-medium mb-1'>
              <Target className='h-3 w-3' /> La jugada del barón
            </div>
            <p className='text-xs leading-snug'>{econ.baronPlay}</p>
          </div>
          <div className='rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 px-3 py-2.5'>
            <div className='flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-red-700 dark:text-red-400 font-medium mb-1'>
              <AlertTriangle className='h-3 w-3' /> La trampa
            </div>
            <p className='text-xs leading-snug'>{econ.trap}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * La prueba visual de "sí sube después": precio medio de cada mes posterior al
 * festival, relativo al precio DURANTE el festival (línea de base = 1.0).
 */
function RecoveryCurve({ curve, peakMonth }: { curve: { month: number; rel: number }[]; peakMonth: number }) {
  if (curve.length < 3) return null
  const max = Math.max(...curve.map((p) => p.rel), 1.05)
  const min = Math.min(...curve.map((p) => p.rel), 0.95)
  const span = max - min || 1
  const h = 34
  const barW = 100 / curve.length

  return (
    <div>
      <div className='relative' style={{ height: h }}>
        {/* línea de base = precio del festival */}
        <div className='absolute left-0 right-0 border-t border-dashed border-muted-foreground/40' style={{ top: `${((max - 1) / span) * h}px` }} />
        {curve.map((p) => {
          const y = ((max - p.rel) / span) * h
          const isPeak = Math.round(p.month) === Math.round(peakMonth)
          const up = p.rel >= 1
          return (
            <div
              key={p.month}
              className={`absolute rounded-sm ${isPeak ? 'bg-emerald-500' : up ? 'bg-emerald-400/50' : 'bg-red-400/50'}`}
              style={{
                left: `${p.month * barW}%`,
                width: `${barW * 0.72}%`,
                top: `${Math.min(y, ((max - 1) / span) * h)}px`,
                height: `${Math.max(2, Math.abs(y - ((max - 1) / span) * h))}px`,
              }}
              title={`mes ${p.month + 1}: ${(p.rel * 100 - 100).toFixed(0)}% vs el precio del festival`}
            />
          )
        })}
      </div>
      <div className='flex justify-between text-[9px] text-muted-foreground mt-0.5'>
        <span>cierra el festival</span>
        <span className='text-emerald-600 dark:text-emerald-400 font-medium'>pico +{((max - 1) * 100).toFixed(0)}%</span>
        <span>{curve.length} meses</span>
      </div>
    </div>
  )
}

const ACTION_TONE: Record<FestivalAction['kind'], { box: string; chip: string; label: string }> = {
  acumular: { box: 'border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900/40', chip: 'bg-sky-600 text-white', label: 'Acumular' },
  vender: { box: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40', chip: 'bg-amber-600 text-white', label: 'Vender' },
  comprar: { box: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40', chip: 'bg-emerald-600 text-white', label: 'Comprar' },
  aguantar: { box: '', chip: 'bg-muted text-muted-foreground', label: 'Aguantar' },
  esperar: { box: '', chip: 'bg-muted text-muted-foreground', label: 'Esperar' },
}

/**
 * El tamaño de la jugada en oro. Escala según qué tipo de ítem es: un material
 * barato se mide por stack de 250, pero una infusión de 300g con 12 unidades
 * listadas no — decir "+31.000g por stack" ahí sería una fantasía. En ese caso
 * se mide contra lo que de verdad hay para comprar.
 */
function PlaySize({ r, action }: { r: EventItemRow; action: FestivalAction }) {
  const isBulk = r.bid > 0 && r.bid < 10000 // < 1g por unidad ⇒ se opera por stacks
  const listed = r.supply
  return (
    <div className='text-xs mt-1 tabular-nums'>
      <span className='text-muted-foreground'>Tamaño de la jugada: </span>
      <strong className='text-emerald-600 dark:text-emerald-400'>+{formatCopper(action.gainPerUnit)}</strong>
      <span className='text-muted-foreground'> por unidad</span>
      {isBulk ? (
        <>
          <span className='text-muted-foreground'> · </span>
          <strong className='text-emerald-600 dark:text-emerald-400'>+{formatCopper(action.gainPerStack)}</strong>
          <span className='text-muted-foreground'> por stack de 250 · demanda {r.demand.toLocaleString('es-MX')}</span>
        </>
      ) : (
        <span className='text-muted-foreground'>
          {' '}· mercado chico: solo <strong className='text-foreground'>{listed.toLocaleString('es-MX')}</strong> en venta
          {listed > 0 && (
            <> — llevándotelas todas serían <strong className='text-emerald-600 dark:text-emerald-400'>+{formatCopper(action.gainPerUnit * listed)}</strong></>
          )}
        </span>
      )}
    </div>
  )
}

/** Una orden concreta por ítem: qué hacer hoy, por qué, y la curva que lo prueba. */
function ActionCard({ r, showCurve }: { r: EventItemRow; showCurve: boolean }) {
  const router = useRouter()
  const c = r.cycle
  if (!c?.action) return null
  const tone = ACTION_TONE[c.action.kind]

  return (
    <button
      onClick={() => router.push(`/gw2/item/${r.itemId}`)}
      className={`w-full text-left rounded-lg border px-3 py-2.5 hover:brightness-[0.99] transition ${tone.box}`}>
      <div className='flex items-start gap-2.5'>
        <ItemIcon src={r.icon} alt={r.name} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${tone.chip}`}>{tone.label}</span>
            <span className='font-medium text-sm'>{r.name}</span>
            <span className='text-xs text-muted-foreground tabular-nums'>{formatCopper(r.bid)}</span>
          </div>
          <div className='text-sm font-medium mt-1 leading-snug'>{c.action.headline}</div>
          <p className='text-xs text-muted-foreground mt-0.5 leading-snug'>{c.action.detail}</p>
          {c.action.gainPerUnit > 0 && <PlaySize r={r} action={c.action} />}
        </div>
        {showCurve && c.curve.length >= 3 && (
          <div className='w-32 shrink-0 hidden sm:block'>
            <RecoveryCurve curve={c.curve} peakMonth={c.medianMonthsToPeak} />
          </div>
        )}
      </div>
    </button>
  )
}

function ActionSection({ title, icon: Icon, rows, tone, emptyNote, showCurve }: { title: string; icon: typeof TrendingUp; rows: EventItemRow[]; tone: 'buy' | 'sell'; emptyNote: string; showCurve: boolean }) {
  const accent = tone === 'buy' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium mb-1.5 ${accent}`}>
        <Icon className='h-3 w-3' /> {title}
      </div>
      {rows.length === 0 ? (
        <p className='text-xs text-muted-foreground leading-snug rounded-lg border bg-background px-3 py-2.5'>{emptyNote}</p>
      ) : (
        <div className='space-y-1.5'>
          {rows.map((r) => (
            <ActionCard key={r.itemId} r={r} showCurve={showCurve} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ ev, defaultOpen }: { ev: EventView; defaultOpen: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section id={ev.slug} className='rounded-xl border scroll-mt-20 overflow-hidden'>
      <button onClick={() => setOpen((o) => !o)} className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors'>
        <span className='text-2xl leading-none shrink-0'>{ev.emoji}</span>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='font-semibold'>{ev.name}</h2>
            <StatusBadge ev={ev} />
            {!ev.confirmed && ev.status !== 'terminado' && <span className='text-[10px] text-muted-foreground'>fechas aprox.</span>}
          </div>
          <div className='flex items-center gap-3 text-xs text-muted-foreground mt-0.5'>
            <span>{fmtWindow(ev.windowStart, ev.windowEnd)}</span>
            <span className='inline-flex items-center gap-1'><MapPin className='h-3 w-3' /> {ev.location}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className='border-t'>
          <p className='px-4 py-3 text-sm text-muted-foreground border-b bg-muted/20'>{ev.strategy}</p>

          {ev.economics && <EconomicsPanel econ={ev.economics} />}

          {/* Qué hacer, medido contra años de historial */}
          <div className='px-4 py-3 border-b space-y-3'>
            <ActionSection
              title='Se hunden en el festival → comprá el dumping y aguantá'
              icon={TrendingDown}
              tone='buy'
              showCurve
              rows={ev.buyPicks}
              emptyNote='Ningún ítem de este festival pagó de forma consistente comprándolo durante el evento. No fuerces la jugada acá.'
            />
            <ActionSection
              title='Suben con el festival → acumulá antes y descargá durante'
              icon={TrendingUp}
              tone='sell'
              showCurve={false}
              rows={ev.sellPicks}
              emptyNote='Ningún ítem sube de precio con este festival — acá no hay ola de demanda que aprovechar vendiendo.'
            />
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-3 py-2 font-medium min-w-56'>Ítem</th>
                  <th className='text-right px-4 py-2 font-medium'>Precio (bid → ask)</th>
                  <th className='text-right px-3 py-2 font-medium whitespace-nowrap'>Efecto festival</th>
                  <th className='text-right px-3 py-2 font-medium whitespace-nowrap'>Retorno neto</th>
                  <th className='text-right px-3 py-2 font-medium whitespace-nowrap'>Hold / vender</th>
                  <th className='text-right px-3 py-2 font-medium whitespace-nowrap'>Hoy vs festival</th>
                  <th className='text-right px-4 py-2 font-medium whitespace-nowrap'>Oferta / Demanda</th>
                  <th className='w-8'></th>
                </tr>
              </thead>
              {ev.groups.map((g) => (
                <tbody key={g.label} className='divide-y'>
                  <tr className='bg-muted/25 border-t'>
                    <td colSpan={9} className='px-4 py-2'>
                      <div className='text-xs font-semibold uppercase tracking-wide text-foreground/80'>{g.label}</div>
                      {g.note && <div className='text-xs text-muted-foreground mt-0.5 max-w-2xl leading-snug'>{g.note}</div>}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.itemId} onClick={() => router.push(`/gw2/item/${r.itemId}`)} className='hover:bg-muted/40 cursor-pointer align-top'>
                      <td className='pl-2 pt-3' onClick={(e) => e.stopPropagation()}><FavoriteStar itemId={r.itemId} /></td>
                      <td className='px-3 py-2.5'>
                        <div className='flex items-start gap-2.5'>
                          <ItemIcon src={r.icon} alt={r.name} />
                          <div className='min-w-0'>
                            <div className='font-medium'>{r.name}</div>
                            {r.note && <div className='text-xs text-muted-foreground mt-0.5 max-w-md leading-snug'>{r.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap'>
                        {r.bid > 0 || r.ask > 0 ? (
                          <span className='inline-flex items-center gap-1 text-xs'>{formatCopper(r.bid)} <ArrowRight className='h-3 w-3' /> {formatCopper(r.ask)}</span>
                        ) : (
                          <span className='text-xs'>sin mercado</span>
                        )}
                      </td>
                      <td className='px-3 py-2.5 text-right tabular-nums whitespace-nowrap'>
                        {r.cycle ? (
                          <>
                            <div className={r.cycle.festivalEffect < 0.97 ? 'text-emerald-600 dark:text-emerald-400' : r.cycle.festivalEffect > 1.03 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}>
                              {r.cycle.festivalEffect >= 1 ? '+' : ''}{((r.cycle.festivalEffect - 1) * 100).toFixed(0)}%
                            </div>
                            <div className={`text-[10px] px-1 py-0.5 rounded inline-block mt-0.5 ${PLAY_STYLE[r.cycle.play]}`}>{PLAY_SHORT[r.cycle.play]}</div>
                          </>
                        ) : (
                          <span className='text-xs text-muted-foreground'>—</span>
                        )}
                      </td>
                      <td className='px-3 py-2.5'>
                        {r.cycle ? <CycleReturn c={r.cycle} /> : <div className='text-right text-xs text-muted-foreground'>—</div>}
                      </td>
                      <td className='px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-xs text-muted-foreground'>
                        {r.cycle && r.cycle.play === 'comprar-en-festival'
                          ? <>{r.cycle.medianMonthsToPeak.toFixed(1)}m · {MONTHS[r.cycle.typicalSellMonth]}</>
                          : '—'}
                      </td>
                      <td className='px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-xs'>
                        {r.cycle?.band ? (
                          <>
                            <div className={BAND_STYLE[r.cycle.band]}>{r.cycle.band}</div>
                            <div className='text-[10px] text-muted-foreground'>fest. {formatCopper(r.cycle.lastFestAvg)}</div>
                          </>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </td>
                      <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap text-xs'>
                        {r.supply.toLocaleString('es-MX')} / {r.demand.toLocaleString('es-MX')}
                      </td>
                      <td className='pr-3 py-2.5 text-right'><LineChart className='h-3.5 w-3.5 text-muted-foreground/60 inline' /></td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className='px-4 py-2 text-[11px] text-muted-foreground border-t leading-snug'>
            <strong>Efecto festival</strong> = cuánto se mueve el precio durante el evento vs los 60 días previos (negativo = lo inundan ⇒ comprar; positivo = lo demandan ⇒ vender). <strong>Retorno neto</strong> = mediana de comprar al precio MEDIO del festival y vender en el pico de la temporada siguiente, ya descontado el 15% del TP; «x/y años» dice en cuántos ciclos funcionó de verdad. <strong>Hoy vs festival</strong> compara el bid actual contra la banda del último festival. Click en cualquier ítem → order book + historial de años.
          </p>
        </div>
      )}
    </section>
  )
}

export default function EventosClient({ events }: { events: EventView[] }) {
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        const rank = (e: EventView) => (e.status === 'activo' ? 0 : e.status === 'proximo' ? 1 : 2)
        if (rank(a) !== rank(b)) return rank(a) - rank(b)
        return new Date(a.nextStart).getTime() - new Date(b.nextStart).getTime()
      }),
    [events],
  )

  const proximos = sorted.filter((e) => e.status !== 'terminado')
  const terminados = sorted.filter((e) => e.status === 'terminado')

  const scrollTo = (slug: string) => {
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className='p-6 space-y-6 max-w-[1100px]'>
      <div className='max-w-3xl'>
        <h1 className='text-lg font-semibold'>Eventos y festivales</h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          Acá no se apuesta: se le compra barato al que apostó y perdió. Durante el festival la gente abre cajas en masa, el 99% pierde, y <strong>el pocos por ciento que gana lista al instante</strong> — eso satura la oferta y hunde el precio. El barón compra ahí y vende meses después, cuando la oferta se secó. Cada festival tiene su propia máquina, y algunos van <strong>al revés</strong> (sus materiales se pagan por las cajas, así que suben). Todo lo de abajo está <strong>medido contra 5 años de historial diario</strong>, con la comisión del TP ya descontada — no son promesas.
        </p>
      </div>

      {/* Calendario compacto */}
      <div className='rounded-xl border divide-y'>
        {sorted.map((ev) => (
          <button key={ev.slug} onClick={() => scrollTo(ev.slug)} className='w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors'>
            <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[ev.status]}`} />
            <span className='text-lg leading-none shrink-0'>{ev.emoji}</span>
            <span className='font-medium flex-1 min-w-0 truncate'>{ev.name}</span>
            <span className='text-xs text-muted-foreground hidden sm:block'>{fmtWindow(ev.windowStart, ev.windowEnd)}</span>
            <div className='w-28 text-right shrink-0'><StatusBadge ev={ev} /></div>
          </button>
        ))}
      </div>

      {/* Detalle por evento — próximos/activos primero, expandidos */}
      {proximos.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Próximos y activos</h2>
          {proximos.map((ev, i) => (
            <EventCard key={ev.slug} ev={ev} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {terminados.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Ya terminaron este año</h2>
          {terminados.map((ev) => (
            <EventCard key={ev.slug} ev={ev} defaultOpen={false} />
          ))}
        </div>
      )}
    </div>
  )
}
