'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, Flame, Shield, Hammer, Crown, CalendarDays, Package, Star, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/gw2', label: 'Grandes Spreads', icon: TrendingUp },
  { href: '/gw2/demanda', label: 'Demanda Subiendo', icon: Flame },
  { href: '/gw2/armaduras', label: 'Armaduras', icon: Shield },
  { href: '/gw2/refinamiento', label: 'Refinamiento', icon: Hammer },
  { href: '/gw2/legendarias', label: 'Legendarias', icon: Crown },
  { href: '/gw2/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/gw2/unidentified', label: 'Unidentified', icon: Package },
  { href: '/gw2/favoritos', label: 'Favoritos', icon: Star },
  { href: '/gw2/buscar', label: 'Buscar ítem', icon: Search },
]

export default function Gw2Nav() {
  const pathname = usePathname()

  return (
    <div className='border-b border-border bg-card'>
      <div className='max-w-[1400px] mx-auto px-6'>
        <div className='flex items-center gap-1 h-11'>
          {TABS.map((tab) => {
            const isActive = tab.href === '/gw2' ? pathname === '/gw2' : pathname.startsWith(tab.href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-11 text-sm border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-foreground text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
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
