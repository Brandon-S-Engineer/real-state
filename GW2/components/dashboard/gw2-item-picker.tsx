'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

export type Gw2ItemLite = { id: number; name: string; icon: string | null; rarity: string; level: number }

export default function Gw2ItemPicker({
  value,
  onChange,
  placeholder,
}: {
  value: Gw2ItemLite | null
  onChange: (item: Gw2ItemLite | null) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<Gw2ItemLite[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(value?.name ?? '')
  }, [value])

  useEffect(() => {
    if (!query.trim() || query === value?.name) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/gw2/items/search?q=${encodeURIComponent(query)}`)
      if (res.ok) setResults(await res.json())
    }, 250)
    return () => clearTimeout(timeout)
  }, [query, value])

  return (
    <div className='relative'>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? 'Buscar ítem por nombre...'}
      />
      {open && results.length > 0 && (
        <div className='absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover shadow-md'>
          {results.map((item) => (
            <button
              key={item.id}
              type='button'
              className='w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2'
              onClick={() => {
                onChange(item)
                setQuery(item.name)
                setResults([])
                setOpen(false)
              }}>
              <span className='truncate'>{item.name}</span>
              <span className='text-xs text-muted-foreground shrink-0'>
                {item.rarity} · lvl {item.level}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
