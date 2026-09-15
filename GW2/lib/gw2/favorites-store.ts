'use client'

import { create } from 'zustand'

interface FavoritesState {
  ids: Set<number>
  loaded: boolean
  load: () => Promise<void>
  toggle: (itemId: number) => Promise<void>
  isFavorite: (itemId: number) => boolean
}

// Dedupe a nivel módulo: cuando una tabla monta 200+ estrellas a la vez, todas
// llaman load() en el mismo tick (antes de que la primera resuelva, loaded sigue
// false), lo que disparaba 200+ fetches idénticos a /api/gw2/favorites y pegaba
// la página. Con esta promesa compartida, las 200 llamadas colapsan en 1 fetch.
let loadInFlight: Promise<void> | null = null

// Store compartido: carga el set de ítems favoritos una vez y lo mantiene
// sincronizado para que el botón estrella se vea igual en todas las tablas.
export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loaded: false,
  load: async () => {
    if (get().loaded) return
    if (loadInFlight) return loadInFlight
    loadInFlight = (async () => {
      try {
        const res = await fetch('/api/gw2/favorites?idsOnly=1')
        if (res.ok) {
          const rows: { itemId: number }[] = await res.json()
          set({ ids: new Set(rows.map((r) => r.itemId)), loaded: true })
        } else {
          set({ loaded: true })
        }
      } finally {
        loadInFlight = null
      }
    })()
    return loadInFlight
  },
  toggle: async (itemId) => {
    const has = get().ids.has(itemId)
    const next = new Set(get().ids)
    if (has) next.delete(itemId)
    else next.add(itemId)
    set({ ids: next }) // optimista

    if (has) {
      await fetch(`/api/gw2/favorites/${itemId}`, { method: 'DELETE' })
    } else {
      await fetch('/api/gw2/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
    }
  },
  isFavorite: (itemId) => get().ids.has(itemId),
}))
