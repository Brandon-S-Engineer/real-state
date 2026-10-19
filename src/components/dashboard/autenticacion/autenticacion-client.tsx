'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Copy, ExternalLink, MessageSquare, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AUTH_PRODUCTS, CHECKLISTS, ENTRUPY_NOTE, ENTRUPY_OTHER, ENTRUPY_PLANS, MODE_CHECKLISTS, SERVICES, SERVICES_NOTE,
  type AuthMode, type AuthProduct, type CheckItem,
} from '@/lib/autenticacion/checklists'
import { DEFAULT_LUGAR, PRINCIPLES, REGATEO, chatScripts, type ChatVars } from '@/lib/autenticacion/mensajes'
import { BAG_BRANDS, TIER_LABEL, TIER_TOKENS } from '@/lib/electronicos/bag-catalog'

const USD_MXN = 18.5
const mxn = (usd: number) => `~$${Math.round(usd * USD_MXN).toLocaleString('es-MX')}`

function EntrupySection() {
  const perToken = ENTRUPY_PLANS[0].perToken
  return (
    <section className='space-y-4'>
      <div className='space-y-2'>
        <h2 className='text-base font-semibold'>Marcas que autentica Entrupy</h2>
        <div className='rounded-md border overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b bg-muted/50'>
                {['Marca', 'Nivel', 'Bolso', 'Cartera / cinturón', 'Modelos en el CRM'].map((h) => (
                  <th key={h} className='px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BAG_BRANDS.map((b) => {
                const t = TIER_TOKENS[b.tier]
                const ultra = b.models.filter((m) => m.ultra)
                return (
                  <tr key={b.code} className='border-b last:border-b-0'>
                    <td className='px-4 py-3 font-medium whitespace-nowrap'>{b.name}</td>
                    <td className='px-4 py-3 text-muted-foreground whitespace-nowrap'>{TIER_LABEL[b.tier]}</td>
                    <td className='px-4 py-3 whitespace-nowrap'>
                      {t.bolso} tokens <span className='text-xs text-muted-foreground'>{mxn(t.bolso * perToken)}</span>
                      {ultra.length > 0 && (
                        <div className='text-xs text-muted-foreground'>
                          {ultra.map((m) => m.label).join(', ')}: {TIER_TOKENS.ULTRA.bolso} tokens {mxn(TIER_TOKENS.ULTRA.bolso * perToken)}
                        </div>
                      )}
                    </td>
                    <td className='px-4 py-3 whitespace-nowrap'>{t.slg} tokens <span className='text-xs text-muted-foreground'>{mxn(t.slg * perToken)}</span></td>
                    <td className='px-4 py-3 text-xs text-muted-foreground'>{b.models.map((m) => m.label).join(', ') || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className='text-xs text-muted-foreground'>
          Costo en pesos con el plan Petit (US${perToken}/token, ${USD_MXN} MXN/USD). No están: Michael Kors, Kate Spade, Tory Burch, Longchamp, Guess.
          Las marcas streetwear (Supreme, BAPE, Palace…) sí, pero sus bolsos valen poco y no entran al CRM.
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='space-y-2'>
          <h2 className='text-base font-semibold'>Planes</h2>
          <div className='rounded-md border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/50'>
                  {['Plan', 'Mes', 'Año', 'Tokens/mes', 'Bolsos Designer/mes'].map((h) => (
                    <th key={h} className='px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENTRUPY_PLANS.map((p) => (
                  <tr key={p.name} className='border-b last:border-b-0'>
                    <td className='px-4 py-3 font-medium'>{p.name}</td>
                    <td className='px-4 py-3 whitespace-nowrap'>US${p.monthly} <span className='text-xs text-muted-foreground'>{mxn(p.monthly)}</span></td>
                    <td className='px-4 py-3 whitespace-nowrap'>US${p.yearly.toLocaleString('en-US')}</td>
                    <td className='px-4 py-3'>{p.tokens}</td>
                    <td className='px-4 py-3'>{Math.floor(p.tokens / TIER_TOKENS.DESIGNER.bolso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-xs text-muted-foreground'>{ENTRUPY_NOTE}</p>
        </div>
        <div className='space-y-2'>
          <h2 className='text-base font-semibold'>Otras categorías de Entrupy</h2>
          <div className='rounded-md border divide-y'>
            {ENTRUPY_OTHER.map((o) => (
              <div key={o.category} className='px-4 py-3'>
                <div className='text-sm font-medium'>{o.category} <span className='text-xs font-normal text-muted-foreground'>· {o.tokens} tokens</span></div>
                <div className='text-xs text-muted-foreground mt-0.5'>{o.brands}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

type Mark = 'ok' | 'fail'
type Review = { ident: string; hora: string; precio: string; marks: Record<string, Mark> }

// La revisión en curso vive en este navegador (una por producto y modo): es la
// hoja que llenas en el trato, no un registro. Lo que se compra se anota en Mis trades.
const TAB_KEY = 'autenticacion-tab'
const MODE_KEY = 'autenticacion-mode'
const LUGAR_KEY = 'autenticacion-lugar'
const reviewKey = (m: AuthMode, p: AuthProduct) => (m === 'COMPRA' ? `autenticacion-review-${p}` : `autenticacion-venta-${p}`)
const EMPTY: Review = { ident: '', hora: '', precio: '', marks: {} }

function loadReview(m: AuthMode, p: AuthProduct): Review {
  try {
    const raw = window.localStorage.getItem(reviewKey(m, p))
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch { return EMPTY }
}

function saveReview(m: AuthMode, p: AuthProduct, r: Review) {
  try { window.localStorage.setItem(reviewKey(m, p), JSON.stringify(r)) } catch { /* modo privado */ }
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success('Copiado') } catch { toast.error('No se pudo copiar') }
}

function Marco({ mode }: { mode: AuthMode }) {
  return (
    <section className='grid gap-2 sm:grid-cols-2 xl:grid-cols-5'>
      {PRINCIPLES[mode].map((pr, i) => (
        <div key={pr.title} className='rounded-lg border px-3 py-2.5'>
          <div className='text-sm font-medium'>{i + 1}. {pr.title}</div>
          <div className='text-xs text-muted-foreground mt-1'>{pr.body}</div>
        </div>
      ))}
    </section>
  )
}

function Regateo({ mode }: { mode: AuthMode }) {
  return (
    <section className='space-y-2'>
      <h2 className='text-base font-semibold'>Cuándo regatear</h2>
      <div className='rounded-md border overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b bg-muted/50'>
              {['Situación', mode === 'COMPRA' ? 'Cuánto y cómo' : 'Qué hacer'].map((h) => (
                <th key={h} className='px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REGATEO[mode].map((r) => (
              <tr key={r.situacion} className='border-b last:border-b-0 align-top'>
                <td className='px-4 py-3 font-medium sm:w-2/5'>{r.situacion}</td>
                <td className='px-4 py-3 text-muted-foreground'>{r.como}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mode === 'COMPRA' && <p className='text-xs text-muted-foreground'>Los datos están en Listings: % vs mercado, antigüedad, precio tachado y score. Los % son punto de partida; ajústalos con lo que veas cerrar.</p>}
    </section>
  )
}

function Mensajes({ mode, product, vars, onVars }: {
  mode: AuthMode
  product: AuthProduct
  vars: ChatVars
  onVars: (v: Partial<ChatVars>) => void
}) {
  const scripts = chatScripts(mode, product)
  return (
    <section className='rounded-lg border'>
      <div className='flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-muted/50'>
        <MessageSquare className='h-4 w-4 text-muted-foreground' />
        <h2 className='text-sm font-semibold mr-auto'>Mensajes</h2>
        <Input placeholder={DEFAULT_LUGAR} value={vars.lugar} onChange={(e) => onVars({ lugar: e.target.value })} className='h-8 w-44' title='Lugar de entrega (se queda guardado)' />
        <Input placeholder='Día y hora (hoy a las 6)' value={vars.hora} onChange={(e) => onVars({ hora: e.target.value })} className='h-8 w-44' />
        <Input placeholder={mode === 'COMPRA' ? 'Oferta / tope' : 'Precio'} inputMode='numeric' value={vars.precio} onChange={(e) => onVars({ precio: e.target.value })} className='h-8 w-32' />
      </div>
      <ul className='divide-y'>
        {scripts.map((sc) => {
          const text = sc.text(vars)
          return (
            <li key={sc.id} className='flex gap-3 px-4 py-3'>
              <div className='min-w-0 flex-1 space-y-1'>
                <div className='text-xs font-medium'>{sc.title} <span className='font-normal text-muted-foreground'>· {sc.when}</span></div>
                <div className='text-sm'>{text}</div>
              </div>
              <button onClick={() => copyText(text)} title='Copiar mensaje' className='shrink-0 self-start p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted'>
                <Copy className='h-3.5 w-3.5' />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ItemRow({ item, mark, onMark }: { item: CheckItem; mark?: Mark; onMark: (m: Mark | undefined) => void }) {
  return (
    <li className={cn('flex gap-3 px-4 py-3 border-b last:border-b-0', mark === 'fail' && 'bg-red-500/5')}>
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
      <div className='min-w-0'>
        <div className={cn('text-sm', mark === 'ok' && 'text-muted-foreground')}>
          {item.label}
          {item.stop && <span className='ml-2 align-middle text-[10px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400'>No compra si falla</span>}
        </div>
        {item.how && <div className='text-xs text-muted-foreground mt-0.5'>{item.how}</div>}
      </div>
    </li>
  )
}

export default function AutenticacionClient() {
  const [product, setProduct] = useState<AuthProduct>('IPHONE')
  const [mode, setMode] = useState<AuthMode>('COMPRA')
  const [review, setReview] = useState<Review>(EMPTY)
  const [lugar, setLugar] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let p: AuthProduct = 'IPHONE'
    let m: AuthMode = 'COMPRA'
    try {
      const saved = window.localStorage.getItem(TAB_KEY) as AuthProduct | null
      if (saved && saved in CHECKLISTS) p = saved
      if (window.localStorage.getItem(MODE_KEY) === 'VENTA') m = 'VENTA'
      setLugar(window.localStorage.getItem(LUGAR_KEY) ?? '')
    } catch { /* modo privado */ }
    setProduct(p)
    setMode(m)
    setReview(loadReview(m, p))
    setLoaded(true)
  }, [])

  const switchTo = (p: AuthProduct, m: AuthMode = mode) => {
    setProduct(p)
    setMode(m)
    setReview(loadReview(m, p))
    try { window.localStorage.setItem(TAB_KEY, p); window.localStorage.setItem(MODE_KEY, m) } catch { /* modo privado */ }
  }

  const update = (r: Review) => { setReview(r); saveReview(mode, product, r) }
  const setVars = (v: Partial<ChatVars>) => {
    if (v.lugar !== undefined) {
      setLugar(v.lugar)
      try { window.localStorage.setItem(LUGAR_KEY, v.lugar) } catch { /* modo privado */ }
    }
    if (v.hora !== undefined || v.precio !== undefined) update({ ...review, ...(v.hora !== undefined && { hora: v.hora }), ...(v.precio !== undefined && { precio: v.precio }) })
  }
  const setMark = (key: string, m: Mark | undefined) => {
    const marks = { ...review.marks }
    if (m) marks[key] = m
    else delete marks[key]
    update({ ...review, marks })
  }

  const phases = MODE_CHECKLISTS[mode][product]
  const services = SERVICES[product]

  const stats = useMemo(() => {
    let total = 0, done = 0
    const blockers: string[] = []
    for (const ph of phases) for (const it of ph.items) {
      total++
      const m = review.marks[`${ph.id}.${it.id}`]
      if (m) done++
      if (m === 'fail' && it.stop) blockers.push(it.label)
    }
    return { total, done, blockers }
  }, [phases, review.marks])

  const copyIdent = () => { if (review.ident.trim()) copyText(review.ident.trim()) }

  const label = AUTH_PRODUCTS.find((p) => p.id === product)?.label

  return (
    <div className='p-3 sm:p-6 space-y-6'>
      <div>
        <h1 className='text-xl font-semibold'>Autenticación</h1>
        <p className='text-sm text-muted-foreground'>
          Del primer mensaje al pago, por producto. Solo en plaza de Polanco; por chat lo mínimo y el rigor en persona.
          Marca cada punto en el trato; se guarda en este navegador hasta que empieces otra.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        <div className='inline-flex rounded-md border p-0.5 bg-muted/40'>
          {(['COMPRA', 'VENTA'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchTo(product, m)}
              className={cn('px-3 py-1 text-sm rounded transition-colors', mode === m ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
            >{m === 'COMPRA' ? 'Compra' : 'Venta'}</button>
          ))}
        </div>
        <div className='inline-flex max-w-full overflow-x-auto rounded-md border p-0.5 bg-muted/40'>
          {AUTH_PRODUCTS.map((p) => (
            <button
              key={p.id}
              onClick={() => switchTo(p.id)}
              className={cn('shrink-0 whitespace-nowrap px-3 py-1 text-sm rounded transition-colors', product === p.id ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {loaded && (
        <>
          <Marco mode={mode} />

          <Regateo mode={mode} />

          <Mensajes mode={mode} product={product} vars={{ lugar, hora: review.hora, precio: review.precio }} onVars={setVars} />

          <div className='rounded-lg border p-4 space-y-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Input
                placeholder={product === 'IPHONE' ? 'IMEI' : product === 'IPAD' ? 'Serie o IMEI' : product === 'BOLSOS' ? 'Certificado Entrupy o código' : 'Número de serie'}
                value={review.ident}
                onChange={(e) => update({ ...review, ident: e.target.value })}
                className='w-64 font-mono'
              />
              <Button variant='outline' size='sm' onClick={copyIdent} disabled={!review.ident.trim()}>
                <Copy className='h-3.5 w-3.5 mr-1.5' />Copiar
              </Button>
              <div className='ml-auto flex items-center gap-3'>
                <span className='text-sm text-muted-foreground'>{stats.done} / {stats.total} revisados</span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => { if (stats.done === 0 && !review.ident || window.confirm(`¿Empezar ${mode === 'COMPRA' ? 'una compra' : 'una venta'} nueva de ${label}? Se borran las marcas actuales.`)) update(EMPTY) }}
                >
                  <RotateCcw className='h-3.5 w-3.5 mr-1.5' />Nueva revisión
                </Button>
              </div>
            </div>
            <div className='h-1.5 rounded-full bg-muted overflow-hidden'>
              <div
                className={cn('h-full transition-all', stats.blockers.length ? 'bg-red-600' : 'bg-green-600')}
                style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }}
              />
            </div>
            {stats.blockers.length > 0 && (
              <div className='rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm'>
                <span className='font-medium text-red-600 dark:text-red-400'>No comprar</span>
                <span className='text-muted-foreground'> · falló: {stats.blockers.join(' · ')}</span>
              </div>
            )}
            {stats.blockers.length === 0 && stats.done === stats.total && stats.total > 0 && (
              <div className='rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400'>
                Todo revisado, sin bloqueos.
              </div>
            )}
          </div>

          <div className='space-y-4'>
            {phases.map((ph, i) => {
              const done = ph.items.filter((it) => review.marks[`${ph.id}.${it.id}`]).length
              return (
                <section key={ph.id} className='rounded-lg border'>
                  <div className='flex items-baseline gap-3 px-4 py-3 border-b bg-muted/50'>
                    <h2 className='text-sm font-semibold'>{i + 1}. {ph.title}</h2>
                    <span className='text-xs text-muted-foreground'>{ph.hint}</span>
                    <span className='ml-auto text-xs text-muted-foreground whitespace-nowrap'>{done} / {ph.items.length}</span>
                  </div>
                  <ul>
                    {ph.items.map((it) => {
                      const key = `${ph.id}.${it.id}`
                      return <ItemRow key={key} item={it} mark={review.marks[key]} onMark={(m) => setMark(key, m)} />
                    })}
                  </ul>
                </section>
              )
            })}
          </div>

          {mode === 'COMPRA' && (
            <>
              <section className='space-y-2'>
                <h2 className='text-base font-semibold'>{product === 'BOLSOS' ? 'Autenticación' : `Consultas con ${product === 'IPHONE' ? 'IMEI' : 'serie'}`}</h2>
                <div className='rounded-md border overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b bg-muted/50'>
                        {['Servicio', 'Costo', 'Usa', 'Qué te dice'].map((h) => (
                          <th key={h} className='px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap'>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.name} className='border-b last:border-b-0'>
                          <td className='px-4 py-3 whitespace-nowrap'>
                            <a href={s.url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 font-medium hover:underline'>
                              {s.name}<ExternalLink className='h-3 w-3 text-muted-foreground' />
                            </a>
                          </td>
                          <td className={cn('px-4 py-3 whitespace-nowrap', s.cost === 'Gratis' ? 'text-green-600 dark:text-green-400' : '')}>{s.cost}</td>
                          <td className='px-4 py-3 whitespace-nowrap text-muted-foreground'>{s.input}</td>
                          <td className='px-4 py-3 text-muted-foreground'>{s.what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {product !== 'BOLSOS' && <p className='text-xs text-muted-foreground'>{SERVICES_NOTE}</p>}
              </section>
              {product === 'BOLSOS' && <EntrupySection />}
            </>
          )}
        </>
      )}
    </div>
  )
}
