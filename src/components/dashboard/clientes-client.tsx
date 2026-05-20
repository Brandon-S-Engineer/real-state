'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Plus, Search, X, Download, MessageCircle,
  AlertCircle, Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ETAPA_LABEL, ETAPA_CADENCIA_LABEL, estadoCadencia, diasDesde, whatsappLink,
  type CadenciaEstado,
} from '@/lib/crm'

type ClienteEtapa = 'A' | 'B' | 'C' | 'D'
type ClienteType = 'COMPRADOR' | 'VENDEDOR' | 'AMBOS' | 'PASADO'
type ClienteFuente = 'REFERIDO' | 'FACEBOOK' | 'INMUEBLES24' | 'LLAMADA' | 'EVENTO' | 'SOI' | 'OTRO'

type Cliente = {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  type: ClienteType
  etapa: ClienteEtapa
  fuente: ClienteFuente
  motivacion: string | null
  timeline: string | null
  ultimoContactoAt: string | null
  proximoContactoAt: string | null
  tags: string[]
  createdAt: string
}

// ── Cadencia badge ────────────────────────────────────────────────────────────

const CADENCIA_CLASS: Record<CadenciaEstado, string> = {
  verde:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  amarillo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  rojo:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  gris:     'bg-muted text-muted-foreground',
}

const ETAPA_CLASS: Record<ClienteEtapa, string> = {
  A: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  B: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  C: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  D: 'bg-muted text-muted-foreground',
}

function DiasSinContacto({ ultimoContactoAt, etapa }: { ultimoContactoAt: string | null; etapa: ClienteEtapa }) {
  const dias = diasDesde(ultimoContactoAt)
  const estado = estadoCadencia(ultimoContactoAt, etapa)
  if (dias === null) {
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1', CADENCIA_CLASS[estado])}>
        Nunca contactado
      </span>
    )
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1', CADENCIA_CLASS[estado])}>
      {dias === 0 ? 'Hoy' : `${dias} ${dias === 1 ? 'día' : 'días'}`}
    </span>
  )
}

// ── Nuevo cliente form (inline) ───────────────────────────────────────────────

function NuevoClienteForm({ onCreated, onCancel }: { onCreated: (c: Cliente) => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [etapa, setEtapa] = useState<ClienteEtapa>('C')
  const [fuente, setFuente] = useState<ClienteFuente>('OTRO')
  const [motivacion, setMotivacion] = useState('')
  const [saving, setSaving] = useState(false)

  const valid = nombre.trim().length > 0

  const save = async () => {
    if (!valid) return
    setSaving(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          etapa,
          fuente,
          motivacion: motivacion.trim() || null,
        }),
      })
      if (!res.ok) {
        toast.error('Error al crear cliente')
        return
      }
      const created: Cliente = await res.json()
      toast.success('Cliente creado')
      onCreated(created)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='rounded-xl border-2 border-ring bg-card p-4 space-y-3'>
      <div className='grid sm:grid-cols-2 gap-3'>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Nombre *</label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder='Nombre completo' autoFocus />
        </div>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Teléfono</label>
          <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder='55 1234 5678' />
        </div>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='cliente@ejemplo.com' type='email' />
        </div>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Etapa</label>
          <select
            value={etapa}
            onChange={(e) => setEtapa(e.target.value as ClienteEtapa)}
            className='w-full border rounded-md px-3 py-2 text-sm bg-background h-9'
          >
            {(['A', 'B', 'C', 'D'] as const).map((e) => (
              <option key={e} value={e}>{ETAPA_LABEL[e]} — cadencia {ETAPA_CADENCIA_LABEL[e]}</option>
            ))}
          </select>
        </div>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Fuente</label>
          <select
            value={fuente}
            onChange={(e) => setFuente(e.target.value as ClienteFuente)}
            className='w-full border rounded-md px-3 py-2 text-sm bg-background h-9'
          >
            <option value='REFERIDO'>Referido</option>
            <option value='FACEBOOK'>Facebook</option>
            <option value='INMUEBLES24'>Inmuebles24</option>
            <option value='LLAMADA'>Llamada en frío</option>
            <option value='EVENTO'>Evento</option>
            <option value='SOI'>Sphere of influence</option>
            <option value='OTRO'>Otro</option>
          </select>
        </div>
      </div>

      <div className='space-y-1'>
        <label className='text-xs font-medium text-muted-foreground'>
          Motivación
          <span className='ml-1 font-normal text-muted-foreground/70'>(opcional — por qué quiere comprar)</span>
        </label>
        <textarea
          value={motivacion}
          onChange={(e) => setMotivacion(e.target.value)}
          rows={2}
          className='w-full border rounded-md px-3 py-2 text-sm bg-background resize-none'
          placeholder='Cambiarse a vivir más cerca del trabajo, le nació el segundo hijo, etc.'
        />
      </div>

      <div className='flex gap-2 justify-end'>
        <Button variant='ghost' size='sm' onClick={onCancel} disabled={saving}>
          <X className='h-3.5 w-3.5 mr-1.5' />
          Cancelar
        </Button>
        <Button size='sm' onClick={save} disabled={saving || !valid}>
          {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
          Crear y abrir
        </Button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClientesClient() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState<ClienteEtapa | ''>('')
  const [filterFuente, setFilterFuente] = useState<ClienteFuente | ''>('')

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) setClientes(await res.json())
    } catch {
      toast.error('Error cargando clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (filterEtapa && c.etapa !== filterEtapa) return false
      if (filterFuente && c.fuente !== filterFuente) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.nombre.toLowerCase().includes(q) &&
          !(c.telefono ?? '').includes(q) &&
          !(c.email ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [clientes, search, filterEtapa, filterFuente])

  // Pendientes: clientes con proximoContactoAt <= hoy
  const pendientesHoy = useMemo(() => {
    const ahora = Date.now()
    return clientes.filter((c) => c.proximoContactoAt && new Date(c.proximoContactoAt).getTime() <= ahora)
  }, [clientes])

  const onCreated = (c: Cliente) => {
    setCreating(false)
    router.push(`/dashboard/clientes/${c.id}`)
  }

  return (
    <div className='p-6 space-y-5'>
      {/* Header */}
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div>
          <h1 className='text-xl font-semibold'>Clientes</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Tu base de datos personal. {clientes.length} contacto{clientes.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div className='flex gap-2'>
          <a
            href='/api/clientes/export?format=csv'
            download
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border bg-background hover:bg-muted transition-colors'
          >
            <Download className='h-3.5 w-3.5' />
            CSV
          </a>
          <a
            href='/api/clientes/export?format=json'
            download
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border bg-background hover:bg-muted transition-colors'
          >
            <Download className='h-3.5 w-3.5' />
            JSON
          </a>
          <Button size='sm' onClick={() => setCreating(true)} disabled={creating}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Nuevo cliente
          </Button>
        </div>
      </div>

      {/* Pendientes hoy banner */}
      {pendientesHoy.length > 0 && (
        <div className='rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm flex items-center gap-2'>
          <AlertCircle className='h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0' />
          <span className='text-amber-900 dark:text-amber-200'>
            <strong>{pendientesHoy.length}</strong> {pendientesHoy.length === 1 ? 'contacto pendiente' : 'contactos pendientes'} hoy o vencidos:
            {' '}
            {pendientesHoy.slice(0, 5).map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <button
                  onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                  className='underline hover:no-underline font-medium'
                >
                  {c.nombre}
                </button>
              </span>
            ))}
            {pendientesHoy.length > 5 && ` y ${pendientesHoy.length - 5} más`}
          </span>
        </div>
      )}

      {/* Nuevo cliente form */}
      {creating && <NuevoClienteForm onCreated={onCreated} onCancel={() => setCreating(false)} />}

      {/* Filters */}
      <div className='flex flex-wrap gap-2 items-center'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
          <Input
            placeholder='Buscar por nombre, teléfono, email...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-8 w-64'
          />
        </div>

        <div className='flex gap-1'>
          {(['A', 'B', 'C', 'D'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFilterEtapa(filterEtapa === e ? '' : e)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                filterEtapa === e
                  ? ETAPA_CLASS[e] + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
              title={ETAPA_LABEL[e]}
            >
              {e}
            </button>
          ))}
        </div>

        <select
          value={filterFuente}
          onChange={(e) => setFilterFuente(e.target.value as ClienteFuente | '')}
          className='border rounded-md px-3 py-1.5 text-sm bg-background h-9'
        >
          <option value=''>Todas las fuentes</option>
          <option value='REFERIDO'>Referido</option>
          <option value='FACEBOOK'>Facebook</option>
          <option value='INMUEBLES24'>Inmuebles24</option>
          <option value='LLAMADA'>Llamada</option>
          <option value='EVENTO'>Evento</option>
          <option value='SOI'>SOI</option>
          <option value='OTRO'>Otro</option>
        </select>

        {(filterEtapa || filterFuente || search) && (
          <Button variant='ghost' size='sm' onClick={() => { setFilterEtapa(''); setFilterFuente(''); setSearch('') }}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Counter */}
      <p className='text-sm text-muted-foreground'>
        {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
        {filtered.length !== clientes.length && ` de ${clientes.length}`}
      </p>

      {/* Table */}
      {loading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      ) : filtered.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground space-y-3'>
          <p>{clientes.length === 0 ? 'No has registrado clientes todavía.' : 'No hay clientes con esos filtros.'}</p>
          {clientes.length === 0 && (
            <Button size='sm' onClick={() => setCreating(true)}>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              Agregar el primero
            </Button>
          )}
        </div>
      ) : (
        <div className='rounded-md border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Nombre</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Etapa</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Teléfono</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Fuente</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Último contacto</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Próximo</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Días sin contacto</th>
                <th className='px-4 py-3'></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const proximo = c.proximoContactoAt ? new Date(c.proximoContactoAt) : null
                const proximoVencido = proximo && proximo.getTime() <= Date.now()
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                    className='border-b hover:bg-muted/30 transition-colors cursor-pointer'
                  >
                    <td className='px-4 py-3'>
                      <div className='font-medium'>{c.nombre}</div>
                      {c.motivacion && (
                        <div className='text-xs text-muted-foreground truncate max-w-[280px]'>{c.motivacion}</div>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-semibold', ETAPA_CLASS[c.etapa])}>
                        {c.etapa}
                      </span>
                    </td>
                    <td className='px-4 py-3 font-mono text-xs'>
                      {c.telefono ?? <span className='text-muted-foreground italic'>—</span>}
                    </td>
                    <td className='px-4 py-3 text-xs text-muted-foreground'>{c.fuente}</td>
                    <td className='px-4 py-3 text-xs text-muted-foreground'>
                      {c.ultimoContactoAt
                        ? new Date(c.ultimoContactoAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                        : '—'}
                    </td>
                    <td className='px-4 py-3 text-xs'>
                      {proximo ? (
                        <span className={cn(proximoVencido && 'text-amber-700 dark:text-amber-400 font-medium')}>
                          {proximo.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <DiasSinContacto ultimoContactoAt={c.ultimoContactoAt} etapa={c.etapa} />
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-0.5' onClick={(e) => e.stopPropagation()}>
                        {c.telefono ? (
                          <>
                            <a
                              href={whatsappLink(c.telefono)}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                              title='Abrir WhatsApp'
                            >
                              <MessageCircle className='h-3.5 w-3.5' />
                            </a>
                            <a
                              href={`tel:${c.telefono.replace(/\D/g, '')}`}
                              className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                              title='Llamar'
                            >
                              <Phone className='h-3.5 w-3.5' />
                            </a>
                          </>
                        ) : (
                          <span className='text-xs text-muted-foreground italic'>sin tel.</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
