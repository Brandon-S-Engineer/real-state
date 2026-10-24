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

export function ItemRow({ item, mark, onMark, actions }: { item: CheckItem; mark?: Mark; onMark: (m: Mark | undefined) => void; actions?: ReactNode }) {
  return (
    <li className={cn('group flex gap-3 px-4 py-3 border-b last:border-b-0', mark === 'fail' && 'bg-red-500/5')}>
      <div className='flex gap-1 shrink-0 pt-0.5'>
        <button
          onClick={() => onMark(mark === 'ok' ? undefined : 'ok')}
          title='Bien'
          className={cn('h-6 w-6 rounded border flex items-center justify-center transition-colors',
            mark === 'ok' ? 'bg-green-600 border-green-600 text-white' : 'text-muted-foreground hover:bg-muted')}
        ><Check className='h-3.5 w-3.5' strokeWidth={3} /></button>
        <button
          onClick={() => onMark(mark === 'fail' ? undefined : 'fail')}
          title='Falla'
          className={cn('h-6 w-6 rounded border flex items-center justify-center transition-colors',
            mark === 'fail' ? 'bg-red-600 border-red-600 text-white' : 'text-muted-foreground hover:bg-muted')}
        ><X className='h-3.5 w-3.5' strokeWidth={3} /></button>
      </div>
      <div className='min-w-0 flex-1'>
        <div className={cn('text-sm', mark === 'ok' && 'text-muted-foreground')}>
          {item.label}
          {item.stop && <span className='ml-2 align-middle text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400'>No compra si falla</span>}
        </div>
        {item.how && <div className='text-xs text-muted-foreground mt-0.5 whitespace-pre-line'>{item.how}</div>}
      </div>
      {actions}
    </li>
  )
}

const iconBtn = 'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none'

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

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(() => next)
    api('/api/autenticacion/checks/orden', 'POST', { ids: next.map((x) => x.id) }).catch(() => toast.error('No se pudo guardar el orden'))
  }

  const done = items.filter((it) => marks[myCheckKey(it.id)]).length

  return (
    <section className='rounded-lg border'>
      <div className='flex items-baseline gap-3 px-4 py-3 border-b bg-muted/50'>
        <h2 className='text-sm font-semibold'>Mi lista</h2>
        <span className='text-xs text-muted-foreground'>En el orden en que lo revisas. Flechas para mover, lápiz para editar.</span>
        <span className='ml-auto text-xs text-muted-foreground whitespace-nowrap'>{done} / {items.length}</span>
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
              item={{ id: it.id, label: `${i + 1}. ${it.label}`, how: it.how ?? undefined, stop: it.stop }}
              mark={marks[myCheckKey(it.id)]}
              onMark={(m) => onMark(myCheckKey(it.id), m)}
              actions={
                <div className='flex shrink-0 items-start gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity'>
                  <button onClick={() => move(i, -1)} disabled={i === 0} title='Subir' className={iconBtn}><ArrowUp className='h-3.5 w-3.5' /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title='Bajar' className={iconBtn}><ArrowDown className='h-3.5 w-3.5' /></button>
                  <button onClick={() => setEditing(it.id)} title='Editar' className={iconBtn}><Pencil className='h-3.5 w-3.5' /></button>
                  <button onClick={() => remove(it)} title='Quitar' className={cn(iconBtn, 'hover:text-red-600')}><Trash2 className='h-3.5 w-3.5' /></button>
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
