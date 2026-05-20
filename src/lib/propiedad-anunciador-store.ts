import { create } from 'zustand'

export type PropiedadAnuncio = {
  id: string
  title: string
  zona: string
  desarrollo: string | null
  price: number
  m2Constructed: number | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpaces: number | null
  amenities: string[]
}

interface State {
  propiedad: PropiedadAnuncio | null
  setPropiedad: (p: PropiedadAnuncio) => void
}

export const usePropiedadAnunciador = create<State>((set) => ({
  propiedad: null,
  setPropiedad: (propiedad) => set({ propiedad }),
}))
