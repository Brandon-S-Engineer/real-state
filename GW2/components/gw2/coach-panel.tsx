import Link from 'next/link'
import { TrendingUp, Crown, Hammer, Shield, CalendarDays, ArrowRight, type LucideIcon } from 'lucide-react'

export type CoachPick = { name: string; iconUrl?: string | null; detail: string; value: string; valueLabel: string; strong?: boolean }
export type CoachSection = {
  icon: 'flip' | 'legendary' | 'refine' | 'armor' | 'event'
  title: string
  allocation: string
  thesis: string
  href: string
  picks: CoachPick[]
}

const ICONS: Record<CoachSection['icon'], LucideIcon> = {
  flip: TrendingUp,
  legendary: Crown,
  refine: Hammer,
  armor: Shield,
  event: CalendarDays,
}

const ACCENT: Record<CoachSection['icon'], string> = {
  flip: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
  legendary: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
  refine: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40',
  armor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
  event: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40',
}

function ItemIcon({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) return <div className='h-6 w-6 rounded bg-muted shrink-0' />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={24} height={24} className='h-6 w-6 rounded shrink-0' loading='lazy' />
}

export default function CoachPanel({ sections }: { sections: CoachSection[] }) {
  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-base font-semibold'>Tu plan para volverte barón</h2>
        <p className='text-sm text-muted-foreground mt-0.5 max-w-3xl'>
          Un portafolio <strong>diversificado</strong>: repartí el capital entre estrategias, no lo metas todo en una. Los % son una guía de cuánto capital asignar a cada una. Cada estrategia rota a distinta velocidad — juntas te llevan a decenas de miles con el tiempo. Se actualiza con cada scan.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-8 text-center text-muted-foreground text-sm'>
          Todavía no hay datos. Corré los scans (Recalcular en cada sección) y volvé.
        </div>
      ) : (
        sections.map((s) => {
          const Icon = ICONS[s.icon]
          return (
            <div key={s.title} className='rounded-xl border overflow-hidden'>
              <Link href={s.href} className='flex items-center gap-2.5 px-4 py-2.5 border-b bg-muted/30 hover:bg-muted/50 transition-colors group'>
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${ACCENT[s.icon]}`}>
                  <Icon className='h-4 w-4' />
                </span>
                <span className='font-semibold'>{s.title}</span>
                <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium uppercase tracking-wide'>{s.allocation} del capital</span>
                <ArrowRight className='h-3.5 w-3.5 text-muted-foreground/50 ml-auto group-hover:text-foreground transition-colors' />
              </Link>
              <p className='px-4 py-2 text-xs text-muted-foreground border-b leading-snug'>{s.thesis}</p>
              <div className='divide-y'>
                {s.picks.map((p, i) => (
                  <div key={i} className='flex items-center gap-2.5 px-4 py-2'>
                    <ItemIcon src={p.iconUrl} alt={p.name} />
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm font-medium truncate'>{p.name}</div>
                      <div className='text-xs text-muted-foreground truncate'>{p.detail}</div>
                    </div>
                    <div className='text-right shrink-0'>
                      <div className={`text-sm font-semibold tabular-nums leading-none ${p.strong === false ? '' : 'text-emerald-600 dark:text-emerald-400'}`}>{p.value}</div>
                      <div className='text-[10px] text-muted-foreground'>{p.valueLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
