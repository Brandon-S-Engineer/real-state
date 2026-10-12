// Búsquedas rápidas de Marketplace (CDMX, más nuevos primero). Las de siempre
// viven aquí; las que agrega el usuario están en la tabla ElecSearch.

import { BAG_BRANDS } from '@/lib/electronicos/bag-catalog'

export type QuickSearch = { id: string; query: string; groupName: string; minPrice: number | null; custom: boolean }

const BASE = 'https://www.facebook.com/marketplace/mexicocity/search'

export function marketplaceUrl(query: string, minPrice: number | null): string {
  // Mismo formato que el link de Marketplace (espacios como %20, no +)
  const min = minPrice ? `minPrice=${minPrice}&` : ''
  return `${BASE}?${min}sortBy=creation_time_descend&query=${encodeURIComponent(query)}&exact=false`
}

const apple: [string, number][] = [
  ['iphone', 5000],
  ['ipad', 4000],
  ['macbook', 8000],
  ['airpods', 1500],
]

// Piso de bolso × 0.4 (redondeado a $500) para que también salgan carteras y
// cinturones; lo que queda abajo del piso de bolso lo marca el CRM como sospechoso.
const brandMin = (floor: number) => Math.max(1000, Math.round((floor * 0.4) / 500) * 500)

export const DEFAULT_SEARCHES: QuickSearch[] = [
  ...apple.map(([q, min]) => ({ id: `d:${q}`, query: q, groupName: 'Apple', minPrice: min, custom: false })),
  ...['bolso', 'bolsa'].map((q) => ({ id: `d:${q}`, query: q, groupName: 'Bolsos', minPrice: 5000, custom: false })),
  ...BAG_BRANDS.map((b) => {
    const q = b.name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    return { id: `d:${q}`, query: q, groupName: 'Bolsos', minPrice: brandMin(b.floor), custom: false }
  }),
]
