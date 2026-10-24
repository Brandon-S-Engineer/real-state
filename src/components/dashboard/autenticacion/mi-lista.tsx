'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowDown, ArrowUp, Check, ListPlus, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AuthMode, AuthProduct, CheckItem, CheckPhase } from '@/lib/autenticacion/checklists'

export type Mark = 'ok' | 'fail'
export type MyCheck = { id: string; label: string; how: string | null; stop: boolean; position: number }

export const myCheckKey = (id: string) => `mine.${id}`

// Título a la izquierda y controles a la derecha; la explicación abajo a todo lo
// ancho. En el celular las acciones de edición van en una fila al final.
export function ItemRow({ item, mark, onMark, actions, prefix }: { item: CheckItem; mark?: Mark; onMark: (m: Mark | undefined) => void; actions?: ReactNode; prefix?: ReactNode }) {
  const markBtn = 'h-8 w-8 sm:h-7 sm:w-7 rounded border flex items-center justify-center transition-colors'
  return (
    <li className={cn('group px-4 py-3 border-b last:border-b-0', mark === 'fail' && 'bg-red-500/5')}>
      <div className='flex items-start gap-3'>
        <div className={cn('min-w-0 flex-1 text-base font-medium leading-snug pt-1', mark === 'ok' && 'text-muted-foreground')}>
          {prefix}{item.label}
          {item.stop && <span className='ml-2 align-middle whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400'>No compra si falla</span>}
        </div>
        {actions && <div className='hidden sm:flex'>{actions}</div>}
        <div className='flex gap-1 shrink-0'>
          <button
            onClick={() => onMark(mark === 'ok' ? undefined : 'ok')}
            title='Bien'
            className={cn(markBtn, mark === 'ok' ? 'bg-green-600 border-green-600 text-white' : 'text-muted-foreground hover:bg-muted')}
          ><Check className='h-4 w-4' strokeWidth={3} /></button>
          <button
            onClick={() => onMark(mark === 'fail' ? undefined : 'fail')}
            title='Falla'
            className={cn(markBtn, mark === 'fail' ? 'bg-red-600 border-red-600 text-white' : 'text-muted-foreground hover:bg-muted')}
          ><X className='h-4 w-4' strokeWidth={3} /></button>
        </div>
      </div>
      {item.how && <div className='text-sm text-muted-foreground mt-1.5 whitespace-pre-line'>{item.how}</div>}
      {actions && <div className='flex justify-end mt-1.5 sm:hidden'>{actions}</div>}
    </li>
  )
}

// Número editable: escribes la posición nueva y Enter (o salir del campo) lo mueve ahí
function PositionInput({ index, total, onMove }: { index: number; total: number; onMove: (to: number) => void }) {
  const [val, setVal] = useState(String(index + 1))
  const [prev, setPrev] = useState(index)
  if (prev !== index) { setPrev(index); setVal(String(index + 1)) }
  const commit = () => {
    const n = Math.round(Number(val))
    if (!Number.isFinite(n) || n < 1) { setVal(String(index + 1)); return }
    const to = Math.min(total, n) - 1
    if (to === index) setVal(String(index + 1))
    else onMove(to)
  }
  return (
    <input
      value={val}
      inputMode='numeric'
      title='Escribe el lugar al que lo quieres mover'
      onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setVal(String(index + 1)); e.currentTarget.blur() }
      }}
      className='mr-1.5 w-9 rounded border border-input/60 bg-transparent px-1 text-center text-base font-medium tabular-nums hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring'
    />
  )
}

const iconBtn = 'p-1.5 sm:p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none'

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)
  if (!res?.ok) throw new Error(String(res?.status ?? 'red'))
  return res.json()
}

function ItemForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial?: { label: string; how: string; stop: boolean }
  submitLabel: string
  onSubmit: (v: { label: string; how: string; stop: boolean }) => Promise<void>
  onCancel?: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [how, setHow] = useState(initial?.how ?? '')
  const [stop, setStop] = useState(initial?.stop ?? false)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!label.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit({ label: label.trim(), how: how.trim(), stop })
      if (!initial) { setLabel(''); setHow(''); setStop(false) }
    } finally { setBusy(false) }
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') onCancel?.()
  }
  return (
    <div className='flex flex-wrap items-center gap-2 px-4 py-3'>
      <Input autoFocus={!!initial} placeholder='Qué revisar' value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={onKey} className='h-8 flex-[2_1_14rem]' />
      <Input placeholder='Cómo (opcional)' value={how} onChange={(e) => setHow(e.target.value)} onKeyDown={onKey} className='h-8 flex-[3_1_14rem]' />
      <button
        type='button'
        onClick={() => setStop(!stop)}
        title='Si falla, no se compra'
        className={cn('h-8 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors',
          stop ? 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400' : 'text-muted-foreground hover:bg-muted')}
      ><ShieldAlert className='h-3.5 w-3.5' />Bloqueante</button>
      <Button size='sm' onClick={submit} disabled={!label.trim() || busy}>
        {initial ? null : <Plus className='h-3.5 w-3.5 mr-1' />}{submitLabel}
      </Button>
      {onCancel && <Button size='sm' variant='ghost' onClick={onCancel}>Cancelar</Button>}
    </div>
  )
}

// Lista propia por modo y producto, en el orden en que se revisa. Vive en la DB
// (AuthCheck) para poder irla puliendo también desde Claude.
export function MiLista({ mode, product, items, setItems, marks, onMark, base }: {
  mode: AuthMode
  product: AuthProduct
  items: MyCheck[]
  setItems: (fn: (xs: MyCheck[]) => MyCheck[]) => void
  marks: Record<string, Mark>
  onMark: (key: string, m: Mark | undefined) => void
  base: CheckPhase[]
}) {
  const [editing, setEditing] = useState<string | null>(null)

  const add = async (v: { label: string; how: string; stop: boolean }) => {
    try {
      const created = (await api('/api/autenticacion/checks', 'POST', { mode, product, items: [v] })) as MyCheck[]
      setItems((xs) => [...xs, ...created])
    } catch { toast.error('No se pudo agregar') }
  }

  const importBase = async () => {
    const all = base.flatMap((ph) => ph.items.map((it) => ({ label: it.label, how: it.how ?? '', stop: !!it.stop })))
    try {
      const created = (await api('/api/autenticacion/checks', 'POST', { mode, product, items: all })) as MyCheck[]
      setItems((xs) => [...xs, ...created])
      toast.success(`${created.length} puntos copiados; ahora ordénalos`)
    } catch { toast.error('No se pudo copiar') }
  }

  const save = async (id: string, v: { label: string; how: string; stop: boolean }) => {
    try {
      const c = (await api(`/api/autenticacion/checks/${id}`, 'PATCH', v)) as MyCheck
      setItems((xs) => xs.map((x) => (x.id === id ? c : x)))
      setEditing(null)
    } catch { toast.error('No se pudo guardar') }
  }

  const remove = async (it: MyCheck) => {
    if (!window.confirm(`¿Quitar "${it.label}"?`)) return
    setItems((xs) => xs.filter((x) => x.id !== it.id))
    onMark(myCheckKey(it.id), undefined)
    api(`/api/autenticacion/checks/${it.id}`, 'DELETE').catch(() => toast.error('No se pudo quitar'))
  }

  const moveTo = (i: number, j: number) => {
    if (j < 0 || j >= items.length || j === i) return
    const next = [...items]
    const [it] = next.splice(i, 1)
    next.splice(j, 0, it)
    setItems(() => next)
    api('/api/autenticacion/checks/orden', 'POST', { ids: next.map((x) => x.id) }).catch(() => toast.error('No se pudo guardar el orden'))
  }

  const done = items.filter((it) => marks[myCheckKey(it.id)]).length

  return (
    <section className='rounded-lg border'>
      <div className='px-4 py-3 border-b bg-muted/50'>
        <div className='flex items-baseline gap-3'>
          <h2 className='text-base font-semibold'>Mi lista</h2>
          <span className='ml-auto text-sm text-muted-foreground whitespace-nowrap'>{done} / {items.length}</span>
        </div>
        <p className='text-sm text-muted-foreground mt-0.5'>En el orden en que lo revisas. Cambia el número para moverlo a ese lugar; flechas para uno en uno.</p>
      </div>
      {items.length > 0 && (
        <ul className='border-b'>
          {items.map((it, i) => editing === it.id ? (
            <li key={it.id} className='border-b last:border-b-0 bg-muted/30'>
              <ItemForm
                initial={{ label: it.label, how: it.how ?? '', stop: it.stop }}
                submitLabel='Guardar'
                onSubmit={(v) => save(it.id, v)}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <ItemRow
              key={it.id}
              item={{ id: it.id, label: it.label, how: it.how ?? undefined, stop: it.stop }}
              prefix={<PositionInput index={i} total={items.length} onMove={(to) => moveTo(i, to)} />}
              mark={marks[myCheckKey(it.id)]}
              onMark={(m) => onMark(myCheckKey(it.id), m)}
              actions={
                <div className='flex shrink-0 items-start gap-1 sm:gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity'>
                  <button onClick={() => moveTo(i, i - 1)} disabled={i === 0} title='Subir' className={iconBtn}><ArrowUp className='h-4 w-4' /></button>
                  <button onClick={() => moveTo(i, i + 1)} disabled={i === items.length - 1} title='Bajar' className={iconBtn}><ArrowDown className='h-4 w-4' /></button>
                  <button onClick={() => setEditing(it.id)} title='Editar' className={iconBtn}><Pencil className='h-4 w-4' /></button>
                  <button onClick={() => remove(it)} title='Quitar' className={cn(iconBtn, 'hover:text-red-600')}><Trash2 className='h-4 w-4' /></button>
                </div>
              }
            />
          ))}
        </ul>
      )}
      <ItemForm submitLabel='Agregar' onSubmit={add} />
      {items.length === 0 && (
        <div className='px-4 pb-3'>
          <Button size='sm' variant='outline' onClick={importBase}>
            <ListPlus className='h-3.5 w-3.5 mr-1.5' />Empezar con la lista base ({base.reduce((n, ph) => n + ph.items.length, 0)} puntos)
          </Button>
        </div>
      )}
    </section>
  )
}
