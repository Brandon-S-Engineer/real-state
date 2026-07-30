'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import SiteThemeToggle from '@/components/site/site-theme-toggle'
import { site } from '@/content/site'

const links = [
  { href: '/work', label: 'Work' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header
      className='sticky top-0 z-50'
      style={{
        background: 'color-mix(in oklch, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)',
      }}>
      <div className='mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-6'>
        <Link
          href='/'
          className='flex items-baseline gap-2.5'>
          <span
            className='site-display text-base font-bold'
            style={{ letterSpacing: '-0.02em' }}>
            {site.name}
          </span>
          <span
            className='site-mono hidden text-[11.5px] sm:inline'
            style={{ color: 'var(--muted)' }}>
            full-stack&nbsp;·&nbsp;AI
          </span>
        </Link>

        <nav className='hidden items-center gap-1 md:flex'>
          {links.map((l) => {
            const active = isActive(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className='rounded-lg px-3 py-2 text-sm transition-colors'
                style={{
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: active ? 600 : 400,
                }}>
                {l.label}
              </Link>
            )
          })}
          <div className='ml-1.5'>
            <SiteThemeToggle />
          </div>
          <a
            href={site.calendlyUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='site-btn site-btn-inverse ml-1.5 h-9 px-4 text-sm'>
            Book a call
          </a>
        </nav>

        <div className='flex items-center gap-1.5 md:hidden'>
          <SiteThemeToggle />
          <button
            aria-label='Toggle menu'
            onClick={() => setOpen((v) => !v)}
            className='grid h-9 w-9 place-items-center rounded-[9px] border'
            style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--fg)' }}>
            {open ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className='md:hidden'
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <nav className='mx-auto flex max-w-[1120px] flex-col px-6 py-2'>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className='rounded-lg px-3 py-3 text-sm'
                style={{ color: isActive(l.href) ? 'var(--accent)' : 'var(--muted)' }}>
                {l.label}
              </Link>
            ))}
            <a
              href={site.calendlyUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => setOpen(false)}
              className='site-btn site-btn-inverse mt-2 h-10 px-4 text-sm'>
              Book a call
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
