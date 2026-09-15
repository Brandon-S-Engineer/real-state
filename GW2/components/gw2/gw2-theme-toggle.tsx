'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Gw2ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className='h-9 w-9' />

  return (
    <Button variant='ghost' size='icon' onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title='Cambiar tema'>
      {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
    </Button>
  )
}
