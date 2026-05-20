'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Car, LogOut, Megaphone, BookOpen, Building2, MapPin, Users, Key } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/zonas', label: 'Zonas', icon: MapPin },
  { href: '/dashboard/anunciador', label: 'Anunciador', icon: Megaphone },
  { href: '/dashboard/plantillas', label: 'Plantillas', icon: BookOpen },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/profile', label: 'Perfil', icon: Settings },
]

export default function Sidebar({ collapsed = false, orgName = 'Edith' }: { collapsed?: boolean; orgName?: string }) {
  const pathname = usePathname()

  return (
    <aside className={cn('h-screen border-r border-border bg-sidebar text-sidebar-foreground flex flex-col sticky top-0 transition-[width] duration-200 shrink-0', collapsed ? 'w-14' : 'w-[170px]')}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-border', collapsed && 'justify-center px-0')}>
        <div className='h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center shrink-0 text-[13px] font-bold'>E</div>
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <div className='text-sm font-semibold truncate'>{orgName}</div>
            <div className='text-[11px] text-muted-foreground truncate'>Administrador</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className='flex-1 p-2 space-y-0.5 overflow-y-auto'>
        {!collapsed && <div className='px-2 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>Platform</div>}
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors relative',
                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}>
              {isActive && !collapsed && <span className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-foreground rounded-r' />}
              <Icon className='h-[18px] w-[18px] shrink-0' />
              {!collapsed && <span className='truncate'>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className='p-2 border-t border-border'>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors', collapsed && 'justify-center px-0')}>
          <LogOut className='h-[18px] w-[18px] shrink-0' />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
