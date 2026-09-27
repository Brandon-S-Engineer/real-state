'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  PanelLeft,
  Moon,
  Sun,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings,
  Key,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/users': 'Users',
  '/dashboard/metrics': 'Metrics',
  '/dashboard/posts': 'Posts',
  '/dashboard/profile': 'Profile',
}

type ElecAlert = {
  id: string
  category: 'MACBOOK' | 'IPHONE' | 'IPAD'
  label: string
  title: string
  config: string
  price: number | null
  url: string
  score: number | null
  lastSeenAt: string
}

const SEEN_KEY = 'topbar-seen-alerts'

function loadSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')) } catch { return new Set() }
}

function saveSeen(ids: Set<string>) {
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200))) } catch { /* modo privado */ }
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.round(mins / 60)}h`
  return `${Math.round(mins / 1440)}d`
}

const money = (n: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString('es-MX')}`)

function DropdownMenu({
  trigger,
  children,
  align = 'end',
  onOpenChange,
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'end' | 'start'
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const toggle = () => setOpen((o) => { const next = !o; onOpenChange?.(next); return next })
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); onOpenChange?.(false) }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onOpenChange])
  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={toggle}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  onClick,
  className = '',
  danger = false,
  children,
}: {
  onClick?: () => void
  className?: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center gap-2 hover:bg-muted/60',
        danger && 'text-red-600 hover:bg-red-500/10',
        className,
      )}
    >
      {children}
    </button>
  )
}

export default function TopBar({
  onToggleSidebar,
  user,
}: {
  onToggleSidebar: () => void
  user: { name: string; email: string; role: string }
}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pageTitle = PAGE_TITLES[pathname] ?? ''

  const [alerts, setAlerts] = useState<ElecAlert[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen())
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/electronicos/alerts')
        if (res.ok) setAlerts((await res.json()).data)
      } catch { /* reintenta en el próximo tick */ }
    }
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [])
  const unseenCount = alerts.filter((a) => !seen.has(a.id)).length
  const markAllSeen = () => {
    if (!alerts.length) return
    const next = new Set(seen)
    for (const a of alerts) next.add(a.id)
    setSeen(next)
    saveSeen(next)
  }

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-3 px-5 sticky top-0 z-30">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="-ml-1.5">
        <PanelLeft className="h-4 w-4" />
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Dashboard</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{pageTitle}</span>
      </div>

      {/* Search trigger */}
      <Link
        href="#"
        className="ml-auto hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-muted/40 text-muted-foreground text-xs hover:bg-muted transition-colors w-[240px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-auto flex items-center gap-0.5 font-mono text-[10px] bg-background border border-border rounded px-1 py-0.5">
          <span>⌘</span><span>K</span>
        </kbd>
      </Link>

      {/* Theme toggle */}
      {mounted && (
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      )}

      {/* Notifications: oportunidades MacBook/iPhone/iPad con score ≥ el umbral configurado en Listings */}
      <DropdownMenu
        onOpenChange={(open) => { if (open) markAllSeen() }}
        trigger={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unseenCount > 0 && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
          </Button>
        }
      >
        <div className="w-[340px] p-0">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Oportunidades</span>
            <span className="text-xs text-muted-foreground">{alerts.length}</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto p-1">
            {alerts.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">Sin oportunidades por ahora</div>
            )}
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-2 hover:bg-muted/60 rounded-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{a.title}</span>
                  <span className="shrink-0 text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{a.score}/10</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{a.label} · {a.config} · {money(a.price)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(a.lastSeenAt)}</div>
              </Link>
            ))}
          </div>
        </div>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu
        trigger={
          <button className="flex items-center gap-2 pl-1 pr-2 h-8 rounded-md hover:bg-muted/60 transition-colors">
            <Avatar name={user.name} size={26} />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-medium leading-tight">{user.name}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{user.email}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        }
      >
        <div className="px-2 py-2 border-b border-border mb-1">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          <Badge variant="outline" className="mt-1">{user.role}</Badge>
        </div>
        <Link href="/dashboard/profile">
          <DropdownItem><UserIcon className="h-3.5 w-3.5" />Profile</DropdownItem>
        </Link>
        <Link href="/dashboard/profile">
          <DropdownItem><Settings className="h-3.5 w-3.5" />Settings</DropdownItem>
        </Link>
        <Link href="/dashboard/profile">
          <DropdownItem><Key className="h-3.5 w-3.5" />API keys</DropdownItem>
        </Link>
        <div className="h-px bg-border my-1" />
        <DropdownItem danger onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-3.5 w-3.5" />Sign out
        </DropdownItem>
      </DropdownMenu>
    </header>
  )
}
