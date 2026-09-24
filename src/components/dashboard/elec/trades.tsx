'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ElecListingDTO, ElecTradeDTO, ElecZoneDTO } from '@/lib/electronicos/serialize'
import { CATALOG, LINES, LINE_LABEL, configShort, money } from './shared'

export type TradeDraft = Partial<Omit<ElecTradeDTO, 'id'>> & { id?: string }

const today = () => new Date().toISOString().slice(0, 10)

export function draftFromListing(l: ElecListingDTO): TradeDraft {
  return {
    listingId: l.id,
    equipo: l.title.slice(0, 120),
    line: l.line, chip: l.chip, ramGb: l.ramGb, ssdGb: l.ssdGb,
    buyPrice: l.price ?? undefined,
    buyDate: today(),
    buyZoneId: l.zoneId,
    costs: 0,
  }
}

function TradeDialog({
  draft, zones, listings, onClose, onSaved,
}: {
  draft: TradeDraft | null
  zones: ElecZoneDTO[]
  listings: ElecListingDTO[]
  onClose: () => void
  onSaved: (t: ElecTradeDTO) => void
}) {
  const [f, setF] = useState<TradeDraft>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (draft) setF(draft) }, [draft])
  if (!draft) return null

  const set = (p: TradeDraft) => setF((x) => ({ ...x, ...p }))
  const num = (v: string) => (v === '' ? null : Number(v))
  const sel = 'w-full border rounded-md px-3 py-2 text-sm bg-background'
  const chips = Array.from(new Set(CATALOG.filter((e) => !f.line || e.line === f.line).flatMap((e) => e.chips)))
  const linkable = listings.filter((l) => l.comprado || l.id === f.listingId)
  const profit = f.sellPrice != null && f.buyPrice != null ? f.sellPrice - f.buyPrice - (f.costs ?? 0) : null

  const save = async () => {
    if (!f.equipo || f.buyPrice == null || !f.buyDate) { toast.error('Equipo, precio y fecha de compra son requeridos'); return }
    setSaving(true)
    try {
      const body = {
        listingId: f.listingId || null,
        equipo: f.equipo,
        line: f.line || null, chip: f.chip || null, ramGb: f.ramGb ?? null, ssdGb: f.ssdGb ?? null,
        buyPrice: f.buyPrice, buyDate: f.buyDate, buyZoneId: f.buyZoneId || null,
        sellPrice: f.sellPrice ?? null, sellDate: f.sellDate || null, sellZoneId: f.sellZoneId || null,
        costs: f.costs ?? 0, notes: f.notes || null,
      }
      const res = await fetch(f.id ? `/api/electronicos/trades/${f.id}` : '/api/electronicos/trades', {
        method: f.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      onSaved(await res.json())
      toast.success(f.id ? 'Trade actualizado' : 'Trade registrado')
      onClose()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!draft} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader><DialogTitle>{f.id ? 'Editar trade' : 'Registrar trade'}</DialogTitle></DialogHeader>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5 col-span-2'>
            <Label>Equipo</Label>
            <Input value={f.equipo ?? ''} onChange={(e) => set({ equipo: e.target.value })} placeholder='MacBook Air M2 16/512 medianoche' />
          </div>
          <div className='space-y-1.5'>
            <Label>Línea</Label>
            <select value={f.line ?? ''} onChange={(e) => set({ line: e.target.value || null })} className={sel}>
              <option value=''>?</option>
              {LINES.map((l) => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>Chip</Label>
            <select value={f.chip ?? ''} onChange={(e) => set({ chip: e.target.value || null })} className={sel}>
              <option value=''>?</option>
              {chips.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>RAM (GB)</Label>
            <Input type='number' value={f.ramGb ?? ''} onChange={(e) => set({ ramGb: num(e.target.value) })} />
          </div>
          <div className='space-y-1.5'>
            <Label>SSD (GB)</Label>
            <Input type='number' value={f.ssdGb ?? ''} onChange={(e) => set({ ssdGb: num(e.target.value) })} />
          </div>

          <div className='col-span-2 text-xs font-medium text-muted-foreground pt-1'>Compra</div>
          <div className='space-y-1.5'>
            <Label>Precio</Label>
            <Input type='number' value={f.buyPrice ?? ''} onChange={(e) => set({ buyPrice: num(e.target.value) ?? undefined })} />
          </div>
          <div className='space-y-1.5'>
            <Label>Fecha</Label>
            <Input type='date' value={f.buyDate?.slice(0, 10) ?? ''} onChange={(e) => set({ buyDate: e.target.value })} />
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Zona</Label>
            <select value={f.buyZoneId ?? ''} onChange={(e) => set({ buyZoneId: e.target.value || null })} className={sel}>
              <option value=''>—</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>

          <div className='col-span-2 text-xs font-medium text-muted-foreground pt-1'>Venta</div>
          <div className='space-y-1.5'>
            <Label>Precio</Label>
            <Input type='number' value={f.sellPrice ?? ''} onChange={(e) => set({ sellPrice: num(e.target.value) })} />
          </div>
          <div className='space-y-1.5'>
            <Label>Fecha</Label>
            <Input type='date' value={f.sellDate?.slice(0, 10) ?? ''} onChange={(e) => set({ sellDate: e.target.value || null })} />
          </div>
          <div className='space-y-1.5'>
            <Label>Zona</Label>
            <select value={f.sellZoneId ?? ''} onChange={(e) => set({ sellZoneId: e.target.value || null })} className={sel}>
              <option value=''>—</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className='space-y-1.5'>
            <Label>Costos (traslado, etc.)</Label>
            <Input type='number' value={f.costs ?? 0} onChange={(e) => set({ costs: num(e.target.value) ?? 0 })} />
          </div>

          <div className='space-y-1.5 col-span-2'>
            <Label>Listing capturado</Label>
            <select value={f.listingId ?? ''} onChange={(e) => set({ listingId: e.target.value || null })} className={sel}>
              <option value=''>— ninguno —</option>
              {linkable.map((l) => <option key={l.id} value={l.id}>{money(l.price)} · {l.title.slice(0, 60)}</option>)}
            </select>
            <p className='text-xs text-muted-foreground'>Aparecen los listings marcados como comprados.</p>
          </div>
          <div className='space-y-1.5 col-span-2'>
            <Label>Notas</Label>
            <Textarea value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} rows={2} />
          </div>
        </div>
        {profit != null && (
          <p className={cn('text-sm font-medium', profit >= 2000 ? 'text-green-600 dark:text-green-400' : profit < 0 ? 'text-red-600 dark:text-red-400' : '')}>
            Ganancia neta: {money(profit)}
          </p>
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

export default function ElecTrades({
  trades, setTrades, zones, listings, draft, setDraft,
}: {
  trades: ElecTradeDTO[]
  setTrades: (fn: (prev: ElecTradeDTO[]) => ElecTradeDTO[]) => void
  zones: ElecZoneDTO[]
  listings: ElecListingDTO[]
  draft: TradeDraft | null
  setDraft: (d: TradeDraft | null) => void
}) {
  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? '—'

  const summary = useMemo(() => {
    const closed = trades.filter((t) => t.profit != null)
    const open = trades.filter((t) => t.profit == null)
    const profit = closed.reduce((a, t) => a + t.profit!, 0)
    const invested = open.reduce((a, t) => a + t.buyPrice + t.costs, 0)
    const hits = closed.filter((t) => t.profit! >= 2000).length
    const avgDays = closed.length ? closed.reduce((a, t) => a + (t.daysInInventory ?? 0), 0) / closed.length : null
    return { closed: closed.length, open: open.length, profit, invested, hits, avgDays, avg: closed.length ? profit / closed.length : null }
  }, [trades])

  const remove = async (t: ElecTradeDTO) => {
    if (!confirm(`¿Borrar el trade "${t.equipo}"?`)) return
    setTrades((prev) => prev.filter((x) => x.id !== t.id))
    await fetch(`/api/electronicos/trades/${t.id}`, { method: 'DELETE' }).catch(() => toast.error('No se pudo borrar'))
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 grid-cols-2 lg:grid-cols-5'>
        <Stat label='Ganancia realizada' value={money(summary.profit)} sub={`${summary.closed} vendidas`} tone={summary.profit >= 0 ? 'good' : 'bad'} />
        <Stat label='Ganancia promedio' value={money(summary.avg)} sub='meta $2,000+' tone={summary.avg != null ? (summary.avg >= 2000 ? 'good' : 'bad') : undefined} />
        <Stat label='Trades ≥ $2,000' value={summary.closed ? `${summary.hits}/${summary.closed}` : '—'} />
        <Stat label='En inventario' value={String(summary.open)} sub={`${money(summary.invested)} invertidos`} />
        <Stat label='Días en inventario' value={summary.avgDays != null ? `${Math.round(summary.avgDays)}d` : '—'} sub='promedio (vendidas)' />
      </div>

      <div className='flex justify-end'>
        <Button size='sm' onClick={() => setDraft({ buyDate: today(), costs: 0 })}><Plus className='h-3.5 w-3.5 mr-1.5' /> Nuevo trade</Button>
      </div>

      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50 text-left'>
              {['Equipo', 'Compra', 'Venta', 'Costos', 'Ganancia neta', 'Días', ''].map((h) => (
                <th key={h} className='px-4 py-3 font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr><td colSpan={7} className='px-4 py-12 text-center text-muted-foreground'>Sin trades todavía — registra una compra desde un listing o con “Nuevo trade”</td></tr>
            ) : trades.map((t) => (
              <tr key={t.id} className='border-b hover:bg-muted/30'>
                <td className='px-4 py-3'>
                  <div className='font-medium'>{t.equipo}</div>
                  <div className='text-xs text-muted-foreground'>{configShort({ line: t.line, chip: t.chip, ramGb: t.ramGb, ssdGb: t.ssdGb })}</div>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  <div>{money(t.buyPrice)}</div>
                  <div className='text-xs text-muted-foreground'>{new Date(t.buyDate).toLocaleDateString('es-MX')} · {zoneName(t.buyZoneId)}</div>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {t.sellPrice != null ? (
                    <>
                      <div>{money(t.sellPrice)}</div>
                      <div className='text-xs text-muted-foreground'>{t.sellDate ? new Date(t.sellDate).toLocaleDateString('es-MX') : '—'} · {zoneName(t.sellZoneId)}</div>
                    </>
                  ) : <span className='text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5'>En inventario</span>}
                </td>
                <td className='px-4 py-3 text-muted-foreground'>{money(t.costs)}</td>
                <td className='px-4 py-3 whitespace-nowrap'>
                  {t.profit != null
                    ? <span className={cn('font-medium', t.profit >= 2000 ? 'text-green-600 dark:text-green-400' : t.profit < 0 ? 'text-red-600 dark:text-red-400' : '')}>{money(t.profit)}</span>
                    : '—'}
                </td>
                <td className='px-4 py-3 text-muted-foreground'>{t.daysInInventory ?? '—'}d</td>
                <td className='px-4 py-3'>
                  <div className='flex gap-0.5'>
                    {t.listingUrl && <a href={t.listingUrl} target='_blank' rel='noopener noreferrer' className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground' title={t.listingTitle ?? ''}><ExternalLink className='h-3.5 w-3.5' /></a>}
                    <button className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground' onClick={() => setDraft({ ...t })}><Pencil className='h-3.5 w-3.5' /></button>
                    <button className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive' onClick={() => remove(t)}><Trash2 className='h-3.5 w-3.5' /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TradeDialog
        draft={draft}
        zones={zones}
        listings={listings}
        onClose={() => setDraft(null)}
        onSaved={(saved) => setTrades((prev) => {
          const exists = prev.some((t) => t.id === saved.id)
          return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]
        })}
      />
    </div>
  )
}

