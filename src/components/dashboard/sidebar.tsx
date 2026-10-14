'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS, isNavActive } from './nav'

function SidebarContent({ collapsed, orgName, onNavigate, onClose }: { collapsed: boolean; orgName: string; onNavigate?: () => void; onClose?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0', collapsed && 'justify-center px-0')}>
        <div className='h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center shrink-0 text-[13px] font-bold'>{orgName.charAt(0)}</div>
        {!collapsed && <div className='flex-1 min-w-0 text-sm font-semibold truncate'>{orgName}</div>}
        {onClose && (
          <button onClick={onClose} className='p-1.5 -mr-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60' aria-label='Cerrar menú'>
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className='flex-1 p-2 overflow-y-auto space-y-3 pt-3'>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className='space-y-0.5'>
            {collapsed
              ? <div className='mx-3 mb-1 h-px bg-border first:hidden' />
              : <div className='px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70'>{section.title}</div>}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(item.href, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
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
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className='p-2 border-t border-border shrink-0'>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors', collapsed && 'justify-center px-0')}>
          <LogOut className='h-[18px] w-[18px] shrink-0' />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  )
}

/**
 * Escritorio (md+): barra fija que se colapsa a íconos.
 * Celular: cajón que se desliza desde la izquierda con fondo oscuro; se cierra
 * al navegar, al tocar fuera o con Escape.
 */
export default function Sidebar({
  collapsed = false, mobileOpen = false, onMobileClose, orgName = 'CRM',
}: { collapsed?: boolean; mobileOpen?: boolean; onMobileClose?: () => void; orgName?: string }) {
  return (
    <>
      <aside className={cn('hidden md:flex h-screen border-r border-border bg-sidebar text-sidebar-foreground flex-col sticky top-0 transition-[width] duration-200 shrink-0', collapsed ? 'w-14' : 'w-[190px]')}>
        <SidebarContent collapsed={collapsed} orgName={orgName} />
      </aside>

      <div className={cn('md:hidden fixed inset-0 z-50', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!mobileOpen}>
        <div onClick={onMobileClose} className={cn('absolute inset-0 bg-black/50 transition-opacity duration-200', mobileOpen ? 'opacity-100' : 'opacity-0')} />
        <aside className={cn('absolute inset-y-0 left-0 w-[260px] max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-border flex flex-col shadow-xl transition-transform duration-200', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
          <SidebarContent collapsed={false} orgName={orgName} onNavigate={onMobileClose} onClose={onMobileClose} />
        </aside>
      </div>
    </>
  )
}
