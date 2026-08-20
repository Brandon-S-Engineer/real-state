'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CandlestickChart, NotebookPen, Activity, Rewind, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'

// Las pestañas de Diario / Estadística / Replay / Escáner son de las fases
// siguientes; se listan ya para que el orden de la sección no cambie después.
const TABS = [
  { href: '/trading', label: 'Mercados', icon: CandlestickChart, listo: true },
  { href: '/trading/diario', label: 'Diario', icon: NotebookPen, listo: true },
  { href: '/trading/estadistica', label: 'Estadística', icon: Activity, listo: false },
  { href: '/trading/replay', label: 'Replay', icon: Rewind, listo: false },
  { href: '/trading/escaner', label: 'Escáner', icon: Radar, listo: false },
]

export default function TradingNav() {
  const pathname = usePathname()

  return (
    <div className='border-b border-border bg-card'>
      <div className='max-w-[1400px] mx-auto px-6'>
        <div className='flex items-center gap-1 h-11'>
          {TABS.map((tab) => {
            const isActive = tab.href === '/trading' ? pathname === '/trading' || pathname.startsWith('/trading/chart') : pathname.startsWith(tab.href)
            const Icon = tab.icon
            if (!tab.listo) {
              return (
                <span
                  key={tab.href}
                  title='Todavía no construido'
                  className='flex items-center gap-1.5 px-3 h-11 text-sm border-b-2 -mb-px border-transparent text-muted-foreground/40 cursor-not-allowed'>
                  <Icon className='h-3.5 w-3.5' />
                  {tab.label}
                </span>
              )
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-11 text-sm border-b-2 -mb-px transition-colors',
                  isActive ? 'border-foreground text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                <Icon className='h-3.5 w-3.5' />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
