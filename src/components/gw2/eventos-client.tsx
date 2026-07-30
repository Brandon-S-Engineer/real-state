'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, LineChart, MapPin } from 'lucide-react'
import FavoriteStar from '@/components/gw2/favorite-star'
import { formatCopper, formatPercent } from '@/lib/gw2/format'

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
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='w-8'></th>
                  <th className='text-left px-3 py-2 font-medium'>Ítem</th>
                  <th className='text-right px-4 py-2 font-medium'>Precio (bid → ask)</th>
                  <th className='text-right px-4 py-2 font-medium'>Spread</th>
                  <th className='text-right px-4 py-2 font-medium'>Profit/flip</th>
                  <th className='text-right px-4 py-2 font-medium whitespace-nowrap'>Oferta / Demanda</th>
                  <th className='w-8'></th>
                </tr>
              </thead>
              {ev.groups.map((g) => (
                <tbody key={g.label} className='divide-y'>
                  <tr className='bg-muted/25 border-t'>
                    <td colSpan={7} className='px-4 py-2'>
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
                      <td className='px-4 py-2.5 text-right tabular-nums'>{r.bid > 0 ? formatPercent(r.spreadPct) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${r.profitFlip > 0 ? '' : 'text-muted-foreground'}`}>{r.bid > 0 ? formatCopper(r.profitFlip) : '—'}</td>
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
          <p className='px-4 py-2 text-[11px] text-muted-foreground border-t'>
            Click en cualquier ítem → order book en vivo + <strong>historial de años</strong> para ver el ciclo del festival.
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
          Los 6 festivales anuales y los ítems ligados a cada uno. La jugada estacional: durante el festival la <strong>oferta se dispara</strong> (todos farmean y abren cofres a la vez) y el precio del material toca fondo — se compra cerca del cierre y se vende meses después, antes del siguiente. Cada ítem abre su <strong>historial de años</strong> para ver el ciclo completo.
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
