'use client'

import { useRouter } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { usePropiedadAnunciador, type PropiedadAnuncio } from '@/lib/propiedad-anunciador-store'

export default function GenerarAnuncioButton({ propiedad }: { propiedad: PropiedadAnuncio }) {
  const setPropiedad = usePropiedadAnunciador((s) => s.setPropiedad)
  const router = useRouter()

  return (
    <button
      onClick={() => {
        setPropiedad(propiedad)
        router.push('/dashboard/anunciador')
      }}
      className='inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-md text-sm border bg-background hover:bg-muted transition-colors'
    >
      <Megaphone className='h-3.5 w-3.5' />
      Generar anuncio
    </button>
  )
}
