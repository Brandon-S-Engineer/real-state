'use client'

import { useEffect } from 'react'
import { Star } from 'lucide-react'
import { useFavorites } from '@/lib/gw2/favorites-store'
import { cn } from '@/lib/utils'

export default function FavoriteStar({ itemId, className }: { itemId: number; className?: string }) {
  const { load, toggle, ids } = useFavorites()
  useEffect(() => { load() }, [load])
  const active = ids.has(itemId)

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(itemId) }}
      title={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className={cn('h-7 w-7 rounded-md flex items-center justify-center transition-colors shrink-0', active ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground/40 hover:text-foreground', className)}>
      <Star className={cn('h-4 w-4', active && 'fill-current')} />
    </button>
  )
}
