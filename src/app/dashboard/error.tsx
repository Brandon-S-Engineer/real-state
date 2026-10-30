'use client'

import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'

// Si una sección no puede leer la base (p. ej. Neon sin cuota), se queda el menú y se ve esto
// en vez de la pantalla de "Application error" — las secciones que no usan la base siguen sirviendo.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className='max-w-lg mx-auto mt-16 space-y-4 text-center'>
      <h2 className='text-lg font-semibold'>No se pudieron cargar los datos</h2>
      <p className='text-sm text-muted-foreground'>
        La base de datos no está respondiendo. El resto del CRM sigue funcionando; Autenticación usa la lista base.
      </p>
      <div className='flex justify-center gap-2'>
        <Button variant='outline' onClick={reset}>Reintentar</Button>
        <Link href='/dashboard/autenticacion' className={buttonVariants()}>Ir a Autenticación</Link>
      </div>
    </div>
  )
}
