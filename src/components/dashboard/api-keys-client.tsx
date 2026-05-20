'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Check, Copy, AlertTriangle, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type ApiKey = {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

type NewKey = ApiKey & { plaintext: string }

// ── New key reveal modal ──────────────────────────────────────────────────────

function NewKeyReveal({ newKey, onDismiss }: { newKey: NewKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(newKey.plaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3'>
      <div className='flex items-start gap-2'>
        <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
        <div className='flex-1 min-w-0'>
          <h3 className='font-semibold text-amber-900 dark:text-amber-200'>
            Tu nueva API key
          </h3>
          <p className='text-sm text-amber-800 dark:text-amber-300 mt-1'>
            <strong>Cópiala ahora</strong> — por seguridad, no la podrás volver a ver.
            Si la pierdes, tendrás que generar una nueva.
          </p>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <code className='flex-1 px-3 py-2 rounded-md bg-background border font-mono text-sm break-all select-all'>
          {newKey.plaintext}
        </code>
        <Button onClick={copy} size='sm'>
          {copied ? <Check className='h-3.5 w-3.5 mr-1.5' /> : <Copy className='h-3.5 w-3.5 mr-1.5' />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      <div className='flex justify-end'>
        <Button variant='ghost' size='sm' onClick={onDismiss}>
          Ya la copié, cerrar
        </Button>
      </div>
    </div>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────

function CreateForm({ onCreated, onCancel }: { onCreated: (k: NewKey) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        toast.error('Error al crear API key')
        return
      }
      const created: NewKey = await res.json()
      onCreated(created)
    } finally { setCreating(false) }
  }

  return (
    <div className='rounded-xl border-2 border-ring bg-card p-4 space-y-3'>
      <div className='space-y-1'>
        <label className='text-xs font-medium text-muted-foreground'>
          Nombre descriptivo
          <span className='ml-1 font-normal text-muted-foreground/70'>
            (para identificar dónde la usas)
          </span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Mi extensión Chrome'
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') create() }}
        />
      </div>
      <div className='flex justify-end gap-2'>
        <Button variant='ghost' size='sm' onClick={onCancel} disabled={creating}>Cancelar</Button>
        <Button size='sm' onClick={create} disabled={creating || !name.trim()}>
          {creating ? <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' /> : null}
          Generar
        </Button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newlyCreated, setNewlyCreated] = useState<NewKey | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-keys')
      if (res.ok) setKeys(await res.json())
    } catch {
      toast.error('Error cargando keys')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const revoke = async (id: string, name: string) => {
    if (!confirm(`¿Revocar la API key "${name}"? Cualquier integración que la use dejará de funcionar.`)) return
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al revocar'); return }
    toast.success('API key revocada')
    fetchKeys()
  }

  const onCreated = (k: NewKey) => {
    setNewlyCreated(k)
    setCreating(false)
    fetchKeys()
  }

  return (
    <div className='p-6 space-y-5 max-w-3xl'>
      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div>
          <h1 className='text-xl font-semibold'>API Keys</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Keys para conectar integraciones externas (extensión de Chrome, Zapier, etc.) con tu CRM.
          </p>
        </div>
        {!newlyCreated && !creating && (
          <Button size='sm' onClick={() => setCreating(true)}>
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Nueva API key
          </Button>
        )}
      </div>

      {newlyCreated && (
        <NewKeyReveal newKey={newlyCreated} onDismiss={() => setNewlyCreated(null)} />
      )}

      {creating && (
        <CreateForm onCreated={onCreated} onCancel={() => setCreating(false)} />
      )}

      {/* Info box */}
      <div className='rounded-md border bg-muted/30 p-3 text-sm space-y-2'>
        <p className='font-medium flex items-center gap-1.5'>
          <Key className='h-4 w-4' />
          Cómo usar tu API key
        </p>
        <p className='text-muted-foreground text-xs leading-relaxed'>
          Incluye la key en el header HTTP de tus requests:
        </p>
        <code className='block px-2 py-1.5 rounded bg-background border font-mono text-xs'>
          Authorization: Bearer rsk_xxxxxxxxxxxxxxxxxxxxxxxxx
        </code>
        <p className='text-muted-foreground text-xs leading-relaxed'>
          Endpoint disponible: <code className='font-mono text-foreground'>POST /api/clientes/inbox</code> — crea un lead nuevo desde una integración.
        </p>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className='flex items-center justify-center py-12 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      ) : keys.length === 0 ? (
        <div className='rounded-xl border-2 border-dashed py-12 text-center text-muted-foreground'>
          <p>No tienes API keys generadas todavía.</p>
        </div>
      ) : (
        <div className='rounded-md border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50'>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Nombre</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Prefijo</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Último uso</th>
                <th className='px-4 py-3 text-left font-medium text-muted-foreground'>Creada</th>
                <th className='px-4 py-3'></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className='border-b last:border-0'>
                  <td className='px-4 py-3 font-medium'>{k.name}</td>
                  <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>{k.prefix}…</td>
                  <td className='px-4 py-3 text-xs text-muted-foreground'>
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'Nunca'}
                  </td>
                  <td className='px-4 py-3 text-xs text-muted-foreground'>
                    {new Date(k.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className='px-4 py-3'>
                    <button
                      onClick={() => revoke(k.id, k.name)}
                      className='p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors'
                      title='Revocar'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
