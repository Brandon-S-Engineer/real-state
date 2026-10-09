'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AREAS, AREA_LABEL, CATEGORY_SUGGESTIONS, GOAL_TABLES, addMonths, businessMonth, monthKey, monthLabel, rowFor, summarizeMonth,
  type Area, type FinanceEntryDTO, type Kind, type TradeLite,
} from '@/lib/finanzas/shared'

const money = (n: number | null | undefined) => (n == null ? '—' : `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-MX')}`)
// Siempre en hora de CDMX: el server corre en UTC y después de las 6pm ya sería "mañana"
const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
const FX_KEY = 'finanzas-fx-usd'
const sel = 'w-full border rounded-md px-3 py-2 text-sm bg-background h-9'

type Draft = { id?: string; date: string; kind: Kind; area: Area; category: string; amount: string; currency: 'MXN' | 'USD'; fxRate: string; note: string }

function loadFx() {
  try { return window.localStorage.getItem(FX_KEY) ?? '18' } catch { return '18' }
}

function EntryDialog({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: (e: FinanceEntryDTO) => void }) {
  const [f, setF] = useState<Draft | null>(draft)
  const [saving, setSaving] = useState(false)
  useEffect(() => setF(draft), [draft])
  if (!f) return null
  const set = (p: Partial<Draft>) => setF((x) => (x ? { ...x, ...p } : x))
  const amount = Number(f.amount)
  const fx = Number(f.fxRate)

  const save = async () => {
    if (!f.category.trim() || !(amount > 0) || (f.currency === 'USD' && !(fx > 0))) { toast.error('Categoría, monto y tipo de cambio son requeridos'); return }
    setSaving(true)
    try {
      if (f.currency === 'USD') { try { window.localStorage.setItem(FX_KEY, f.fxRate) } catch { /* modo privado */ } }
      const res = await fetch(f.id ? `/api/finanzas/entries/${f.id}` : '/api/finanzas/entries', {
        method: f.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: f.date, kind: f.kind, area: f.area, category: f.category.trim(), amount, currency: f.currency, fxRate: f.currency === 'USD' ? fx : 1, note: f.note || null }),
      })
      if (!res.ok) throw new Error()
      onSaved(await res.json())
      toast.success(f.id ? 'Movimiento actualizado' : 'Movimiento registrado')
      onClose()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!draft} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader><DialogTitle>{f.id ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle></DialogHeader>
        <div className='inline-flex rounded-md border p-0.5 bg-muted/40 w-full'>
          {(['INGRESO', 'EGRESO'] as Kind[]).map((k) => (
            <button key={k} onClick={() => set({ kind: k, category: '' })} className={cn('flex-1 px-3 py-1.5 text-sm rounded transition-colors', f.kind === k ? cn('bg-background shadow-sm font-medium', k === 'INGRESO' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground')}>
              {k === 'INGRESO' ? 'Ingreso' : 'Egreso'}
            </button>
          ))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label>Fecha</Label>
            <Input type='date' value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className='space-y-1.5'>
            <Label>Área</Label>
            <select value={f.area} onChange={(e) => set({ area: e.target.value as Area, category: '' })} className={sel}>
              {AREAS.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
            </select>
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Categoría</Label>
            <Input list='fin-categorias' value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder='Escribe o elige' />
            <datalist id='fin-categorias'>
              {CATEGORY_SUGGESTIONS[f.area][f.kind].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className='space-y-1.5'>
            <Label>Monto</Label>
            <Input type='number' min={0} step='0.01' value={f.amount} onChange={(e) => set({ amount: e.target.value })} />
          </div>
          <div className='space-y-1.5'>
            <Label>Moneda</Label>
            <select value={f.currency} onChange={(e) => set({ currency: e.target.value as 'MXN' | 'USD', fxRate: e.target.value === 'USD' ? loadFx() : '1' })} className={sel}>
              <option value='MXN'>MXN</option>
              <option value='USD'>USD</option>
            </select>
          </div>
          {f.currency === 'USD' && (
            <div className='space-y-1.5 col-span-2'>
              <Label>Tipo de cambio (MXN por USD)</Label>
              <Input type='number' min={0} step='0.01' value={f.fxRate} onChange={(e) => set({ fxRate: e.target.value })} />
              {amount > 0 && fx > 0 && <p className='text-xs text-muted-foreground'>= {money(amount * fx)} MXN</p>}
            </div>
          )}
          <div className='space-y-1.5 col-span-2'>
            <Label>Nota</Label>
            <Textarea value={f.note} onChange={(e) => set({ note: e.target.value })} rows={2} />
          </div>
        </div>
        {f.area === 'REVENTA' && (
          <p className='text-xs text-muted-foreground'>Las compras y ventas registradas en “Mis trades” ya se suman solas; aquí anota lo demás.</p>
        )}
        <Button onClick={save} disabled={saving} className='w-full'>Guardar</Button>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className='rounded-lg border p-4'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={cn('text-xl font-semibold mt-1', tone === 'good' && 'text-green-600 dark:text-green-400', tone === 'bad' && 'text-red-600 dark:text-red-400')}>{value}</div>
      {sub && <div className='text-xs text-muted-foreground mt-0.5'>{sub}</div>}
    </div>
  )
}

export default function FinanzasClient({ entries: initial, trades, monthlyGoal }: { entries: FinanceEntryDTO[]; trades: TradeLite[]; monthlyGoal: number }) {
  const [entries, setEntries] = useState(initial)
  const [goal, setGoal] = useState(monthlyGoal)
  const [goalInput, setGoalInput] = useState(String(monthlyGoal))
  const currentKey = monthKey(todayIso())
  const [month, setMonth] = useState(currentKey)
  const [draft, setDraft] = useState<Draft | null>(null)

  const summary = useMemo(() => summarizeMonth(month, entries, trades), [month, entries, trades])
  const monthEntries = useMemo(() => entries.filter((e) => monthKey(e.date) === month), [entries, month])
  const history = useMemo(() => Array.from({ length: 12 }, (_, i) => summarizeMonth(addMonths(currentKey, -i), entries, trades)), [currentKey, entries, trades])
  const inventory = useMemo(() => trades.filter((t) => t.profit == null).reduce((a, t) => a + t.invested, 0), [trades])

  // Mes del negocio: desde la primera actividad de reventa (trade o movimiento)
  const startKey = useMemo(() => {
    const keys = [...trades.map((t) => monthKey(t.buyDate)), ...entries.filter((e) => e.area === 'REVENTA').map((e) => monthKey(e.date))].sort()
    return keys[0] ?? null
  }, [trades, entries])
  const bizMonth = businessMonth(startKey, month)

  const isCurrent = month === currentKey
  const [ty, tm, td] = todayIso().split('-').map(Number)
  const daysInMonth = new Date(ty, tm, 0).getDate()
  const projection = isCurrent ? (summary.neto / td) * daysInMonth : null
  const pct = goal > 0 ? Math.max(0, Math.min(100, (summary.neto / goal) * 100)) : 0
  const egresos = AREAS.reduce((a, k) => a + summary.byArea[k].egresos, 0)

  const saveGoal = async () => {
    const v = Number(goalInput)
    if (!(v > 0) || v === goal) { setGoalInput(String(goal)); return }
    setGoal(v)
    const res = await fetch('/api/finanzas/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyGoal: v }) }).catch(() => null)
    if (res?.ok) toast.success('Meta actualizada')
    else toast.error('No se pudo guardar la meta')
  }

  const remove = async (e: FinanceEntryDTO) => {
    if (!confirm(`¿Borrar "${e.category}" por ${money(e.amountMxn)}?`)) return
    setEntries((prev) => prev.filter((x) => x.id !== e.id))
    await fetch(`/api/finanzas/entries/${e.id}`, { method: 'DELETE' }).catch(() => toast.error('No se pudo borrar'))
  }

  const newDraft = (): Draft => ({
    date: isCurrent ? todayIso() : `${month}-01`, kind: 'INGRESO', area: 'REVENTA', category: '', amount: '', currency: 'MXN', fxRate: '1', note: '',
  })

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>Finanzas</h1>
          <p className='text-sm text-muted-foreground mt-1'>Ganancia mensual de reventa y software · mes {bizMonth} del negocio</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='inline-flex items-center rounded-md border'>
            <button className='p-2 hover:bg-muted rounded-l-md' onClick={() => setMonth((m) => addMonths(m, -1))} title='Mes anterior'><ChevronLeft className='h-4 w-4' /></button>
            <span className='px-3 text-sm font-medium capitalize min-w-36 text-center'>{monthLabel(month)}</span>
            <button className='p-2 hover:bg-muted rounded-r-md disabled:opacity-40' onClick={() => setMonth((m) => addMonths(m, 1))} disabled={isCurrent} title='Mes siguiente'><ChevronRight className='h-4 w-4' /></button>
          </div>
          <Button size='sm' onClick={() => setDraft(newDraft())}><Plus className='h-3.5 w-3.5 mr-1.5' /> Movimiento</Button>
        </div>
      </div>

      {/* Meta del mes */}
      <div className='rounded-lg border p-4 space-y-3'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <div className='text-xs text-muted-foreground'>Ganancia neta del mes</div>
            <div className={cn('text-3xl font-semibold', summary.neto >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{money(summary.neto)}</div>
            {projection != null && <div className='text-xs text-muted-foreground mt-0.5'>A este ritmo cierras en ~{money(projection)}</div>}
          </div>
          <label className='flex items-center gap-2 text-sm text-muted-foreground'>
            Meta mensual
            <Input type='number' value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onBlur={saveGoal} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} className='w-32 h-8' />
          </label>
        </div>
        <div className='h-2.5 rounded-full bg-muted overflow-hidden'>
          <div className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500' : 'bg-foreground/70')} style={{ width: `${pct}%` }} />
        </div>
        <div className='text-xs text-muted-foreground'>{Math.round(pct)}% de {money(goal)}{summary.neto < goal && ` · faltan ${money(goal - summary.neto)}`}</div>
      </div>

      <div className='grid gap-3 grid-cols-2 lg:grid-cols-4'>
        <Stat label='Reventa (neto)' value={money(summary.byArea.REVENTA.neto)} sub={`${summary.trades.sold} equipos vendidos · ${money(summary.trades.profit)} de trades`} tone={summary.byArea.REVENTA.neto >= 0 ? 'good' : 'bad'} />
        <Stat label='Software (neto)' value={money(summary.byArea.SOFTWARE.neto)} sub={`${money(summary.byArea.SOFTWARE.ingresos)} ingresos`} tone={summary.byArea.SOFTWARE.neto >= 0 ? 'good' : 'bad'} />
        <Stat label='Egresos del mes' value={money(egresos)} sub='movimientos capturados' />
        <Stat label='Capital en inventario' value={money(inventory)} sub='trades sin vender (hoy)' />
      </div>

      {/* Movimientos */}
      <section className='space-y-2'>
        <h2 className='text-base font-semibold'>Movimientos de {monthLabel(month)}</h2>
        <div className='rounded-md border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-left'>
                {['Fecha', 'Área', 'Categoría', 'Monto', 'Nota', ''].map((h) => <th key={h} className='px-4 py-3 font-medium text-muted-foreground whitespace-nowrap'>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 ? (
                <tr><td colSpan={6} className='px-4 py-10 text-center text-muted-foreground'>Sin movimientos este mes — anota ingresos de Upwork, anuncios, transporte, lotes…</td></tr>
              ) : monthEntries.map((e) => (
                <tr key={e.id} className='border-b hover:bg-muted/30'>
                  <td className='px-4 py-3 whitespace-nowrap text-muted-foreground'>{new Date(`${e.date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                  <td className='px-4 py-3'>{AREA_LABEL[e.area]}</td>
                  <td className='px-4 py-3'>{e.category}</td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    <span className={cn('font-medium', e.kind === 'INGRESO' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {e.kind === 'INGRESO' ? '+' : '−'}{money(e.amountMxn)}
                    </span>
                    {e.currency === 'USD' && <div className='text-xs text-muted-foreground'>US${e.amount.toLocaleString('es-MX')} × {e.fxRate}</div>}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground max-w-64 truncate' title={e.note ?? ''}>{e.note ?? ''}</td>
                  <td className='px-4 py-3'>
                    <div className='flex gap-0.5'>
                      <button className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground' onClick={() => setDraft({ id: e.id, date: e.date, kind: e.kind, area: e.area, category: e.category, amount: String(e.amount), currency: e.currency, fxRate: String(e.fxRate), note: e.note ?? '' })}><Pencil className='h-3.5 w-3.5' /></button>
                      <button className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive' onClick={() => remove(e)}><Trash2 className='h-3.5 w-3.5' /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historial */}
      <section className='space-y-2'>
        <h2 className='text-base font-semibold'>Últimos 12 meses</h2>
        <div className='rounded-md border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50 text-left'>
                {['Mes', 'Reventa', 'Software', 'Otro', 'Total', 'vs meta'].map((h) => <th key={h} className='px-4 py-3 font-medium text-muted-foreground whitespace-nowrap'>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const p = goal > 0 ? Math.max(0, Math.min(100, (h.neto / goal) * 100)) : 0
                return (
                  <tr key={h.key} onClick={() => setMonth(h.key)} className={cn('border-b hover:bg-muted/30 cursor-pointer', h.key === month && 'bg-muted/40')}>
                    <td className='px-4 py-2.5 capitalize whitespace-nowrap'>{monthLabel(h.key)}</td>
                    {AREAS.map((a) => <td key={a} className='px-4 py-2.5 whitespace-nowrap text-muted-foreground'>{h.byArea[a].neto ? money(h.byArea[a].neto) : '—'}</td>)}
                    <td className={cn('px-4 py-2.5 whitespace-nowrap font-medium', h.neto < 0 && 'text-red-600 dark:text-red-400')}>{h.neto ? money(h.neto) : '—'}</td>
                    <td className='px-4 py-2.5 w-40'>
                      <div className='h-1.5 rounded-full bg-muted overflow-hidden'><div className='h-full bg-foreground/60' style={{ width: `${p}%` }} /></div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Metas de referencia */}
      <section className='space-y-3'>
        <div>
          <h2 className='text-base font-semibold'>Metas de referencia (reventa)</h2>
          <p className='text-sm text-muted-foreground'>
            Estimaciones de octubre 2026, comprando y vendiendo todo desde tus zonas (sin trasladarte). Resaltado: el mes {bizMonth} del negocio
            {startKey ? ` (empezó en ${monthLabel(startKey)})` : ' — empieza a contar con tu primer trade o movimiento de reventa'}.
          </p>
        </div>
        <div className='space-y-4'>
          {GOAL_TABLES.map((t) => {
            const row = rowFor(t.rows, bizMonth)
            const reventa = summary.byArea.REVENTA.neto
            return (
              <div key={t.id} className='rounded-lg border'>
                <div className='px-4 py-3 border-b'>
                  <div className='font-medium'>{t.title}</div>
                  <div className='text-sm text-muted-foreground'>{t.meta}</div>
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b bg-muted/50 text-left'>
                        {['Etapa', 'Ventas / mes', t.detalleLabel, 'Capital rotando', 'Neto / mes', 'Qué frena'].map((h) => <th key={h} className='px-3 py-2 font-medium text-muted-foreground whitespace-nowrap'>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r) => (
                        <tr key={r.etapa} className={cn('border-b last:border-0', r === row && 'bg-blue-50 dark:bg-blue-950/30')}>
                          <td className='px-3 py-2 whitespace-nowrap font-medium'>{r.etapa}</td>
                          <td className='px-3 py-2'>{r.volumen}</td>
                          <td className='px-3 py-2 whitespace-nowrap text-muted-foreground'>{r.detalle}</td>
                          <td className='px-3 py-2 whitespace-nowrap text-muted-foreground'>{r.capital}</td>
                          <td className='px-3 py-2 whitespace-nowrap font-medium'>{r.netoMes}</td>
                          <td className='px-3 py-2 text-muted-foreground'>{r.freno}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className='px-4 py-3 border-t text-xs text-muted-foreground space-y-1'>
                  {row && (
                    <div className='text-foreground'>
                      Reventa de {monthLabel(month)}: <strong>{money(reventa)}</strong> —{' '}
                      {reventa >= row.max ? 'arriba del rango' : reventa >= row.min ? 'dentro del rango' : `debajo del rango (${money(row.min)}–${money(row.max)})`}
                    </div>
                  )}
                  <div>{t.nota}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <EntryDialog draft={draft} onClose={() => setDraft(null)} onSaved={(saved) => setEntries((prev) => {
        const exists = prev.some((x) => x.id === saved.id)
        const next = exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]
        return next.sort((a, b) => b.date.localeCompare(a.date))
      })} />
    </div>
  )
}
