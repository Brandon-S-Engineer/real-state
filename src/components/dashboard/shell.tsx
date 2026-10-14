'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/dashboard/sidebar'
import TopBar from '@/components/dashboard/topbar'
import ChatWidget from '@/components/dashboard/chat-widget'

export default function DashboardShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Al cambiar de página el cajón del celular se cierra solo
  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    // Que no se mueva la página de fondo mientras el menú está abierto
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [mobileOpen])

  const toggleSidebar = () => {
    if (!window.matchMedia('(min-width: 768px)').matches) { setMobileOpen((o) => !o); return }
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('sidebar-collapsed', String(next))
      } catch {}
      return next
    })
  }

  return (
    <div className='flex min-h-screen bg-sidebar text-foreground'>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className='flex-1 min-w-0 flex flex-col'>
        <TopBar
          onToggleSidebar={toggleSidebar}
          user={user}
        />
        <main className='flex-1 min-w-0 p-1 sm:p-4 md:p-8 max-w-[1400px] w-full mx-auto'>{children}</main>
      </div>
      <ChatWidget />
    </div>
  )
}
