import {
  Wallet, Search, Smartphone, Tablet, Laptop, Headphones, ShoppingBag, ShieldCheck,
  Briefcase, Clapperboard, Users, MapPin, Key, Settings, type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }
export type NavSection = { title: string; items: NavItem[] }

// Ocultas del menú (las rutas siguen vivas, sin borrar): Propiedades,
// Anunciador y Plantillas — del negocio de bienes raíces/autos.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'General',
    items: [
      { href: '/dashboard/finanzas', label: 'Finanzas', icon: Wallet },
    ],
  },
  {
    title: 'Reventa',
    items: [
      { href: '/dashboard/busquedas', label: 'Búsquedas', icon: Search },
      { href: '/dashboard/iphone', label: 'iPhone', icon: Smartphone },
      { href: '/dashboard/ipad', label: 'iPad', icon: Tablet },
      { href: '/dashboard/macbook', label: 'MacBook', icon: Laptop },
      { href: '/dashboard/audifonos', label: 'Audífonos', icon: Headphones },
      { href: '/dashboard/bolsos', label: 'Bolsos', icon: ShoppingBag },
      { href: '/dashboard/autenticacion', label: 'Autenticación', icon: ShieldCheck },
    ],
  },
  {
    title: 'Upwork',
    items: [
      { href: '/dashboard/upwork', label: 'Trabajos', icon: Briefcase },
      { href: '/dashboard/demos', label: 'Demos', icon: Clapperboard },
    ],
  },
  {
    title: 'CRM',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/zonas', label: 'Zonas', icon: MapPin },
    ],
  },
  {
    title: 'Config',
    items: [
      { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
      { href: '/dashboard/profile', label: 'Perfil', icon: Settings },
    ],
  },
]

export function isNavActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

/** Título de la página actual para la barra superior. */
export function navTitle(pathname: string): string {
  for (const s of NAV_SECTIONS) for (const i of s.items) if (isNavActive(i.href, pathname)) return i.label
  return ''
}
