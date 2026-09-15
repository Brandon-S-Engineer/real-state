'use client'

// ── Auto-refresco de una página server-side ──────────────────────────────────
//
// `router.refresh()` vuelve a ejecutar el server component y sustituye el HTML
// sin recargar la pestaña: no se pierde el scroll, ni la rareza seleccionada, ni
// ningún estado de React. Es lo que evita andar recargando a mano para ver
// precios frescos.
//
// Se pausa cuando la pestaña está en segundo plano: refrescar una pestaña que
// nadie está mirando solo gasta llamadas a la API de GW2.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function AutoRefresh({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter()
  const [desde, setDesde] = useState(() => Date.now())
  const [hace, setHace] = useState(0)
  const [refrescando, setRefrescando] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.hidden) return
      setHace(Math.floor((Date.now() - desde) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [desde])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      setRefrescando(true)
      router.refresh()
      // `router.refresh()` no devuelve promesa; se marca el momento y se deja
      // que el próximo render limpie el indicador.
      setDesde(Date.now())
      setHace(0)
      setTimeout(() => setRefrescando(false), 1200)
    }, segundos * 1000)
    return () => clearInterval(id)
  }, [router, segundos])

  return (
    <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground' title={`Los precios se actualizan solos cada ${segundos}s`}>
      <RefreshCw className={`h-3 w-3 ${refrescando ? 'animate-spin' : ''}`} />
      {refrescando ? 'actualizando…' : hace < 5 ? 'precios al día' : `hace ${hace}s`}
    </span>
  )
}
