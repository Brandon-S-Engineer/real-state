'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

// Matches the Claude Design nav toggle: 36×36 bordered box with a ☾/☀ mono glyph.
export default function SiteThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      aria-label='Toggle theme'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className='site-mono grid h-9 w-9 place-items-center rounded-[9px] border text-[13px]'
      style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--fg)' }}>
      {mounted ? (isDark ? '☾' : '☀') : '☾'}
    </button>
  )
}
