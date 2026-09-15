'use client'

// ── Buscar ítem ──────────────────────────────────────────────────────────────
//
// Antes esta pantalla tenía su propia versión recortada del detalle (solo dos
// gráficas de 7 días). Ahora reutiliza `ItemDetailClient` entero: order book en
// vivo, cuentas del flip, historial de 7 días, historial largo de años con
// selector de rango, volumen diario comprado/vendido, y el ciclo semanal con sus
// 10 ventanas.
//
// Reutilizar en vez de duplicar importa: eran dos juegos de gráficas que había
// que mantener en paralelo y que ya se habían desincronizado.

import { useState } from 'react'
import Gw2ItemPicker, { type Gw2ItemLite } from '@/components/dashboard/gw2-item-picker'
import ItemDetailClient from '@/components/gw2/item-detail-client'

export default function Gw2MarketExplorerClient() {
  const [selected, setSelected] = useState<Gw2ItemLite | null>(null)

  return (
    <div className='space-y-5'>
      <div className='max-w-md'>
        <Gw2ItemPicker value={selected} onChange={setSelected} placeholder='Buscar cualquier ítem — ej. Superior Sigil of Force' />
      </div>

      {selected ? (
        // `key` fuerza el remontaje al cambiar de ítem: sin esto el componente
        // conservaría el estado de rangos y gráficas del ítem anterior.
        <ItemDetailClient key={selected.id} itemId={selected.id} embedded />
      ) : (
        <p className='text-sm text-muted-foreground py-6'>
          Elegí un ítem para ver su order book en vivo, el historial de 7 días, el de años, el volumen diario comprado/vendido y su ciclo
          semanal.
        </p>
      )}
    </div>
  )
}
