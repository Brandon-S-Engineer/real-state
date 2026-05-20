'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, MessageCircle, Phone, Plus, Check, X, Pencil, Trash2,
  Loader2, Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ETAPA_LABEL, ETAPA_CADENCIA_LABEL, TOQUES_90D, whatsappLink, diasDesde,
  estadoCadencia, type CadenciaEstado,
} from '@/lib/crm'

// ── Types ─────────────────────────────────────────────────────────────────────

type ClienteEtapa = 'A' | 'B' | 'C' | 'D'
type ClienteType = 'COMPRADOR' | 'VENDEDOR' | 'AMBOS' | 'PASADO'
type ClienteFuente = 'REFERIDO' | 'FACEBOOK' | 'INMUEBLES24' | 'LLAMADA' | 'EVENTO' | 'SOI' | 'OTRO'
type ContactoTipo = 'LLAMADA' | 'WHATSAPP' | 'EMAIL' | 'VISITA' | 'EVENTO' | 'NOTA' | 'OTRO'
type ContactoEstado = 'PLANEADO' | 'REALIZADO' | 'OMITIDO'

type Contacto = {
  id: string
  tipo: ContactoTipo
  estado: ContactoEstado
  fechaProgramada: string
  realizadoAt: string | null
  resumen: string | null
}

type Cliente = {
  id: string
  nombre: string
  telefono: string | null
  telefonoVerificado: boolean
  email: string | null
  emailVerificado: boolean
  type: ClienteType
  etapa: ClienteEtapa
  fuente: ClienteFuente
  motivacion: string | null
  timeline: string | null
  presupuestoMin: number | null
  presupuestoMax: number | null
  referredById: string | null
  referredByName: string | null
  referredBy: { id: string; nombre: string } | null
  spouseName: string | null
  spousePhone: string | null
  birthday: string | null
  notasPerma: string | null
  tags: string[]
  ultimoContactoAt: string | null
  proximoContactoAt: string | null
  contactos: Contacto[]
}

const ETAPA_CLASS: Record<ClienteEtapa, string> = {
  A: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  B: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  C: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  D: 'bg-muted text-muted-foreground',
}

const CADENCIA_CLASS: Record<CadenciaEstado, string> = {
  verde:    'text-green-700 dark:text-green-400',
  amarillo: 'text-yellow-700 dark:text-yellow-400',
  rojo:     'text-red-700 dark:text-red-400',
  gris:     'text-muted-foreground',
}

const TIPO_LABEL: Record<ContactoTipo, string> = {
  LLAMADA: 'Llamada', WHATSAPP: 'WhatsApp', EMAIL: 'Email',
  VISITA: 'Visita', EVENTO: 'Evento', NOTA: 'Nota', OTRO: 'Otro',
}

function fmtFecha(date: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit' }) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-MX', opts)
}

function fmtPrecio(n: number | null) {
  if (n == null) return null
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

// ── Editable text field ───────────────────────────────────────────────────────

function EditableField({
  label, value, multiline, placeholder, onSave,
}: {
  label: string
  value: string | null
  multiline?: boolean
  placeholder?: string
  onSave: (v: string | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(value ?? '') }, [value])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft.trim() || null)
      setEditing(false)
    } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className='space-y-2'>
        <p className='text-xs font-medium text-muted-foreground'>{label}</p>
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className='w-full border rounded-md px-3 py-2 text-sm bg-background resize-none'
            autoFocus
          />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} autoFocus />
        )}
        <div className='flex gap-1 justify-end'>
          <Button variant='ghost' size='sm' onClick={() => { setDraft(value ?? ''); setEditing(false) }} disabled={saving}>
            <X className='h-3.5 w-3.5' />
          </Button>
          <Button size='sm' onClick={save} disabled={saving}>
            {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Check className='h-3.5 w-3.5' />}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-0.5 group'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-xs font-medium text-muted-foreground'>{label}</p>
        <button
          onClick={() => setEditing(true)}
          className='opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted'
        >
          <Pencil className='h-3 w-3' />
        </button>
      </div>
      {value
        ? <p className='text-sm whitespace-pre-wrap'>{value}</p>
        : <button onClick={() => setEditing(true)} className='text-sm text-muted-foreground/60 italic hover:text-foreground transition-colors'>{placeholder ?? 'Agregar'}</button>}
    </div>
  )
}

// ── Plan section ──────────────────────────────────────────────────────────────

function PlanSection({
  clienteId, etapa, contactos, onChange,
}: {
  clienteId: string
  etapa: ClienteEtapa
  contactos: Contacto[]
  onChange: () => void
}) {
  const ahora = Date.now()
  const planeados = contactos
    .filter((c) => c.estado === 'PLANEADO')
    .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())

  const [generating, setGenerating] = useState(false)
  const [adding, setAdding] = useState(false)

  const generarPlan = async (force = false) => {
    setGenerating(true)
    try {
      const url = `/api/clientes/${clienteId}/generar-plan${force ? '?force=1' : ''}`
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (res.status === 409) {
        if (confirm(`Ya hay ${data.existentes} toques planeados. ¿Reemplazarlos?`)) {
          return generarPlan(true)
        }
        return
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Error al generar plan')
        return
      }
      toast.success(`${data.created} toques planeados generados`)
      onChange()
    } finally { setGenerating(false) }
  }

  const marcarRealizado = async (contactoId: string) => {
    const res = await fetch(`/api/clientes/${clienteId}/contactos/${contactoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'REALIZADO' }),
    })
    if (!res.ok) {
      toast.error('Error al marcar')
      return
    }
    toast.success('Toque marcado como realizado')
    onChange()
  }

  const eliminar = async (contactoId: string) => {
    if (!confirm('¿Eliminar este toque planeado?')) return
    const res = await fetch(`/api/clientes/${clienteId}/contactos/${contactoId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Error al eliminar')
      return
    }
    onChange()
  }

  return (
    <div className='rounded-xl border bg-card p-4 space-y-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Plan 90 días</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Cadencia sugerida etapa {etapa}: {ETAPA_CADENCIA_LABEL[etapa]} ({TOQUES_90D[etapa]} toques en 90 días).
          </p>
        </div>
        <div className='flex gap-2'>
          {planeados.length === 0 && (
            <Button size='sm' variant='outline' onClick={() => generarPlan()} disabled={generating}>
              {generating ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : <Wand2 className='h-3.5 w-3.5 mr-1.5' />}
              Generar plan
            </Button>
          )}
          <Button size='sm' onClick={() => setAdding((v) => !v)}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Agregar toque
          </Button>
        </div>
      </div>

      {adding && (
        <NuevoContactoForm
          clienteId={clienteId}
          modo='PLANEADO'
          onDone={() => { setAdding(false); onChange() }}
          onCancel={() => setAdding(false)}
        />
      )}

      {planeados.length === 0 && !adding ? (
        <p className='text-sm text-muted-foreground text-center py-4'>
          No hay toques planeados. Genera un plan o agrega uno manualmente.
        </p>
      ) : (
        <div className='space-y-1.5'>
          {planeados.map((c) => {
            const fecha = new Date(c.fechaProgramada)
            const vencido = fecha.getTime() <= ahora
            return (
              <div
                key={c.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md border text-sm',
                  vencido && 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20'
                )}
              >
                <button
                  onClick={() => marcarRealizado(c.id)}
                  className='h-5 w-5 rounded border-2 border-muted-foreground/40 hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors shrink-0'
                  title='Marcar como realizado'
                />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className={cn('text-xs font-medium', vencido && 'text-amber-700 dark:text-amber-400')}>
                      {fmtFecha(c.fechaProgramada, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className='text-xs text-muted-foreground'>· {TIPO_LABEL[c.tipo]}</span>
                  </div>
                  {c.resumen && <p className='text-sm text-muted-foreground'>{c.resumen}</p>}
                </div>
                <button
                  onClick={() => eliminar(c.id)}
                  className='h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0'
                  title='Eliminar'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Historial section ─────────────────────────────────────────────────────────

function HistorialSection({
  clienteId, contactos, onChange,
}: {
  clienteId: string
  contactos: Contacto[]
  onChange: () => void
}) {
  const realizados = contactos
    .filter((c) => c.estado === 'REALIZADO')
    .sort((a, b) => {
      const ta = new Date(a.realizadoAt ?? a.fechaProgramada).getTime()
      const tb = new Date(b.realizadoAt ?? b.fechaProgramada).getTime()
      return tb - ta
    })

  const [adding, setAdding] = useState(false)

  return (
    <div className='rounded-xl border bg-card p-4 space-y-3'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Historial</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {realizados.length} {realizados.length === 1 ? 'interacción registrada' : 'interacciones registradas'}.
          </p>
        </div>
        <Button size='sm' onClick={() => setAdding((v) => !v)}>
          <Plus className='h-3.5 w-3.5 mr-1.5' />
          Registrar actividad
        </Button>
      </div>

      {adding && (
        <NuevoContactoForm
          clienteId={clienteId}
          modo='REALIZADO'
          onDone={() => { setAdding(false); onChange() }}
          onCancel={() => setAdding(false)}
        />
      )}

      {realizados.length === 0 && !adding ? (
        <p className='text-sm text-muted-foreground text-center py-4'>
          Sin interacciones registradas todavía.
        </p>
      ) : (
        <div className='space-y-2 relative'>
          {realizados.map((c) => (
            <div key={c.id} className='flex gap-3 text-sm'>
              <div className='shrink-0 pt-0.5 w-20 text-xs text-muted-foreground'>
                {fmtFecha(c.realizadoAt ?? c.fechaProgramada)}
              </div>
              <div className='flex-1 min-w-0 pb-2 border-b last:border-0'>
                <div className='font-medium text-xs text-muted-foreground uppercase tracking-wider'>
                  {TIPO_LABEL[c.tipo]}
                </div>
                {c.resumen && <p className='text-sm whitespace-pre-wrap mt-0.5'>{c.resumen}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form: nuevo contacto / actividad ──────────────────────────────────────────

function NuevoContactoForm({
  clienteId, modo, onDone, onCancel,
}: {
  clienteId: string
  modo: 'PLANEADO' | 'REALIZADO'
  onDone: () => void
  onCancel: () => void
}) {
  const [tipo, setTipo] = useState<ContactoTipo>('WHATSAPP')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [resumen, setResumen] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        tipo,
        estado: modo,
        fechaProgramada: new Date(fecha).toISOString(),
        resumen: resumen.trim() || null,
      }
      if (modo === 'REALIZADO') body.realizadoAt = new Date(fecha).toISOString()

      const res = await fetch(`/api/clientes/${clienteId}/contactos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error('Error al guardar')
        return
      }
      toast.success(modo === 'PLANEADO' ? 'Toque planeado' : 'Actividad registrada')
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <div className='rounded-md border-2 border-ring bg-background p-3 space-y-2'>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ContactoTipo)}
            className='w-full border rounded-md px-2 py-1.5 text-sm bg-background h-8'
          >
            <option value='WHATSAPP'>WhatsApp</option>
            <option value='LLAMADA'>Llamada</option>
            <option value='EMAIL'>Email</option>
            <option value='VISITA'>Visita</option>
            <option value='EVENTO'>Evento</option>
            <option value='NOTA'>Nota</option>
            <option value='OTRO'>Otro</option>
          </select>
        </div>
        <div className='space-y-1'>
          <label className='text-xs font-medium text-muted-foreground'>
            {modo === 'PLANEADO' ? 'Fecha programada' : 'Fecha de realización'}
          </label>
          <Input type='date' value={fecha} onChange={(e) => setFecha(e.target.value)} className='h-8' />
        </div>
      </div>
      <div className='space-y-1'>
        <label className='text-xs font-medium text-muted-foreground'>
          {modo === 'PLANEADO' ? 'Nota / objetivo' : 'Resumen de lo que pasó'}
        </label>
        <textarea
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
          rows={2}
          placeholder={modo === 'PLANEADO' ? 'Mandar artículo sobre plusvalía...' : 'Le interesó Manigua, mandar más info...'}
          className='w-full border rounded-md px-2 py-1.5 text-sm bg-background resize-none'
          autoFocus
        />
      </div>
      <div className='flex gap-1 justify-end'>
        <Button variant='ghost' size='sm' onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button size='sm' onClick={save} disabled={saving}>
          {saving ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
          Guardar
        </Button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClienteDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCliente = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes/${id}`)
      if (res.status === 404) {
        toast.error('Cliente no encontrado')
        router.push('/dashboard/clientes')
        return
      }
      if (!res.ok) throw new Error()
      setCliente(await res.json())
    } catch {
      toast.error('Error cargando cliente')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { fetchCliente() }, [fetchCliente])

  const patch = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast.error('Error al actualizar')
      return
    }
    await fetchCliente()
  }

  const deleteCliente = async () => {
    if (!cliente) return
    if (!confirm(`¿Eliminar a ${cliente.nombre}? Se eliminarán todas las interacciones registradas.`)) return
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al eliminar'); return }
    toast.success('Cliente eliminado')
    router.push('/dashboard/clientes')
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24 text-muted-foreground'>
        <Loader2 className='h-5 w-5 animate-spin' />
      </div>
    )
  }
  if (!cliente) return null

  const cadencia = estadoCadencia(cliente.ultimoContactoAt, cliente.etapa)
  const diasUltimo = diasDesde(cliente.ultimoContactoAt)

  return (
    <div className='p-6 space-y-5 max-w-5xl'>
      {/* Back */}
      <Link
        href='/dashboard/clientes'
        className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        <ArrowLeft className='h-3.5 w-3.5' />
        Clientes
      </Link>

      {/* Header */}
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <div className='flex-1 min-w-0 space-y-2'>
          <h1 className='text-xl font-semibold'>{cliente.nombre}</h1>
          <div className='flex items-center gap-2 flex-wrap'>
            <select
              value={cliente.etapa}
              onChange={(e) => patch({ etapa: e.target.value })}
              className={cn('px-2 py-0.5 rounded-md text-xs font-semibold border-0 cursor-pointer', ETAPA_CLASS[cliente.etapa])}
            >
              {(['A', 'B', 'C', 'D'] as const).map((e) => (
                <option key={e} value={e}>{ETAPA_LABEL[e]}</option>
              ))}
            </select>
            <span className='text-xs text-muted-foreground'>·</span>
            <select
              value={cliente.fuente}
              onChange={(e) => patch({ fuente: e.target.value })}
              className='text-xs text-muted-foreground bg-transparent border-0 cursor-pointer hover:text-foreground'
            >
              <option value='REFERIDO'>Fuente: Referido</option>
              <option value='FACEBOOK'>Fuente: Facebook</option>
              <option value='INMUEBLES24'>Fuente: Inmuebles24</option>
              <option value='LLAMADA'>Fuente: Llamada</option>
              <option value='EVENTO'>Fuente: Evento</option>
              <option value='SOI'>Fuente: SOI</option>
              <option value='OTRO'>Fuente: Otro</option>
            </select>
            {cliente.ultimoContactoAt && (
              <>
                <span className='text-xs text-muted-foreground'>·</span>
                <span className={cn('text-xs', CADENCIA_CLASS[cadencia])}>
                  Último contacto hace {diasUltimo === 0 ? 'hoy' : `${diasUltimo} ${diasUltimo === 1 ? 'día' : 'días'}`}
                  {' '}(cadencia {ETAPA_CADENCIA_LABEL[cliente.etapa]})
                </span>
              </>
            )}
          </div>
        </div>

        <div className='flex gap-2 shrink-0'>
          {cliente.telefono ? (
            <>
              <a
                href={whatsappLink(cliente.telefono)}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity'
              >
                <MessageCircle className='h-3.5 w-3.5' />
                WhatsApp
              </a>
              <a
                href={`tel:${cliente.telefono.replace(/\D/g, '')}`}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border bg-background hover:bg-muted transition-colors'
              >
                <Phone className='h-3.5 w-3.5' />
                Llamar
              </a>
            </>
          ) : (
            <span className='inline-flex items-center px-3 py-1.5 rounded-md text-xs border border-dashed text-muted-foreground italic'>
              Sin teléfono — agrégalo abajo
            </span>
          )}
          <button
            onClick={deleteCliente}
            className='p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
            title='Eliminar cliente'
          >
            <Trash2 className='h-4 w-4' />
          </button>
        </div>
      </div>

      {/* Contact info */}
      <div className='rounded-xl border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div className='space-y-3'>
          <EditableField
            label='Teléfono'
            value={cliente.telefono}
            placeholder='55 1234 5678'
            onSave={(v) => patch({ telefono: v })}
          />
          <EditableField
            label='Email'
            value={cliente.email}
            placeholder='cliente@ejemplo.com'
            onSave={(v) => patch({ email: v })}
          />
        </div>
        <div className='space-y-3'>
          <EditableField
            label='Pareja (nombre)'
            value={cliente.spouseName}
            placeholder='Nombre del cónyuge'
            onSave={(v) => patch({ spouseName: v })}
          />
          <EditableField
            label='Pareja (teléfono)'
            value={cliente.spousePhone}
            placeholder='55 1234 5678'
            onSave={(v) => patch({ spousePhone: v })}
          />
        </div>
      </div>

      {/* Perfil */}
      <div className='rounded-xl border bg-card p-4 space-y-4'>
        <h2 className='text-sm font-semibold'>Perfil</h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <EditableField
            label='Motivación (por qué quiere comprar)'
            value={cliente.motivacion}
            multiline
            placeholder='Crecer en familia, primera inversión, mudarse al norte...'
            onSave={(v) => patch({ motivacion: v })}
          />
          <EditableField
            label='Timeline'
            value={cliente.timeline}
            placeholder='3-6 meses, antes de junio, cuando venda su casa actual...'
            onSave={(v) => patch({ timeline: v })}
          />
          <div className='space-y-1'>
            <p className='text-xs font-medium text-muted-foreground'>Presupuesto</p>
            <p className='text-sm'>
              {cliente.presupuestoMin || cliente.presupuestoMax ? (
                <>
                  {fmtPrecio(cliente.presupuestoMin) ?? '—'} a {fmtPrecio(cliente.presupuestoMax) ?? '—'}
                </>
              ) : (
                <button
                  onClick={() => {
                    const min = prompt('Presupuesto mínimo (MXN):')
                    const max = prompt('Presupuesto máximo (MXN):')
                    patch({
                      presupuestoMin: min ? Number(min.replace(/\D/g, '')) || null : null,
                      presupuestoMax: max ? Number(max.replace(/\D/g, '')) || null : null,
                    })
                  }}
                  className='text-muted-foreground/60 italic hover:text-foreground transition-colors'
                >
                  Agregar rango
                </button>
              )}
            </p>
          </div>
          <EditableField
            label='Referido por'
            value={cliente.referredByName}
            placeholder='Nombre de quien lo refirió'
            onSave={(v) => patch({ referredByName: v })}
          />
        </div>
        <EditableField
          label='Notas evergreen (no se borran, siempre visibles)'
          value={cliente.notasPerma}
          multiline
          placeholder='Trabaja en Google, tiene 2 hijos, prefiere zona arbolada...'
          onSave={(v) => patch({ notasPerma: v })}
        />
      </div>

      {/* Plan 90 días */}
      <PlanSection
        clienteId={cliente.id}
        etapa={cliente.etapa}
        contactos={cliente.contactos}
        onChange={fetchCliente}
      />

      {/* Historial */}
      <HistorialSection
        clienteId={cliente.id}
        contactos={cliente.contactos}
        onChange={fetchCliente}
      />
    </div>
  )
}
