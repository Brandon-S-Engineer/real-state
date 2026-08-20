'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Trash2, X } from 'lucide-react'
import { Sparkline } from '@/components/dashboard/charts'
import { TIMEFRAMES, type Timeframe } from '@/content/trading-instruments'
import { calcularTrade, computeStats, cortarPor, sesionDe, diaSemanaDe, MUESTRA_MINIMA, type TradeEntrada, type TradeCalculado } from '@/lib/trading/stats'

export type TradeSerializado = {
  id: string
  symbol: string
  timeframe: string
  mode: string
  direccion: string
  plannedEntry: number
  plannedStop: number
  plannedTarget: number | null
  riskPct: number | null
  entryAt: string
  entryPrice: number
  exitAt: string | null
  exitPrice: number | null
  sizeUnits: number | null
  fees: number
  session: string | null
  setupId: string | null
  notas: string | null
  createdAt: string
  updatedAt: string
}

export type DiarioInit = {
  trades: TradeSerializado[]
  setups: { id: string; nombre: string; reglas: string; activo: boolean }[]
  instrumentos: { symbol: string; nombre: string; digits: number }[]
}

const MODOS = [
  { key: 'live', label: 'Real' },
  { key: 'replay', label: 'Replay' },
  { key: 'backtest', label: 'Backtest' },
] as const

const SESION_LABEL: Record<string, string> = { asia: 'Asia', londres: 'Londres', ny: 'Nueva York', solape: 'Solape LDN/NY' }

function fmtR(r: number | null | undefined) {
  if (r == null) return '—'
  return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`
}

function Metrica({ label, valor, tono, sub }: { label: string; valor: string; tono?: 'bueno' | 'malo' | 'neutro'; sub?: string }) {
  const color = tono === 'bueno' ? 'text-emerald-600 dark:text-emerald-400' : tono === 'malo' ? 'text-red-500' : ''
  return (
    <div className='rounded-xl border p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{valor}</div>
      {sub && <div className='text-[10px] text-muted-foreground mt-0.5'>{sub}</div>}
    </div>
  )
}

export default function DiarioClient({ init }: { init: DiarioInit }) {
  const router = useRouter()
  const [modo, setModo] = useState<string>('live')
  const [abriendo, setAbriendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculadas: TradeCalculado[] = useMemo(() => {
    return init.trades
      .filter((t) => t.mode === modo)
      .map((t) => {
        const entrada: TradeEntrada = {
          ...t,
          entryAt: new Date(t.entryAt),
          exitAt: t.exitAt ? new Date(t.exitAt) : null,
        }
        return calcularTrade(entrada)
      })
  }, [init.trades, modo])

  const stats = useMemo(() => computeStats(calculadas), [calculadas])
  const cerradas = useMemo(() => calculadas.filter((t) => !t.abierta), [calculadas])

  const setupNombre = useMemo(() => new Map(init.setups.map((s) => [s.id, s.nombre])), [init.setups])

  // Los precios se muestran con los decimales del instrumento; sin esto 1.10000
  // se ve como "1.1" y no se puede comparar de un vistazo columna contra columna.
  const digitsDe = useMemo(() => new Map(init.instrumentos.map((i) => [i.symbol, i.digits])), [init.instrumentos])
  const fmtPrecio = (v: number | null | undefined, symbol: string) =>
    v == null ? '—' : v.toFixed(digitsDe.get(symbol) ?? 5)

  const cortes = useMemo(
    () => ({
      setup: cortarPor(cerradas, (t) => t.setupId, (k) => setupNombre.get(k) ?? 'sin setup'),
      sesion: cortarPor(cerradas, (t) => sesionDe(t.entryAt), (k) => SESION_LABEL[k] ?? k),
      dia: cortarPor(cerradas, (t) => diaSemanaDe(t.entryAt)),
      symbol: cortarPor(cerradas, (t) => t.symbol),
    }),
    [cerradas, setupNombre],
  )

  const crear = async (form: FormData) => {
    setGuardando(true)
    setError(null)
    const num = (k: string) => {
      const v = form.get(k)
      return v === null || v === '' ? null : Number(v)
    }
    const str = (k: string) => {
      const v = form.get(k)
      return v === null || v === '' ? null : String(v)
    }
    const exitAt = str('exitAt')
    const body = {
      symbol: str('symbol'),
      timeframe: str('timeframe'),
      mode: modo,
      direccion: str('direccion'),
      plannedEntry: num('plannedEntry'),
      plannedStop: num('plannedStop'),
      plannedTarget: num('plannedTarget'),
      riskPct: num('riskPct'),
      entryAt: new Date(str('entryAt')!).toISOString(),
      entryPrice: num('entryPrice') ?? num('plannedEntry'),
      exitAt: exitAt ? new Date(exitAt).toISOString() : null,
      exitPrice: num('exitPrice'),
      sizeUnits: num('sizeUnits'),
      fees: num('fees') ?? 0,
      setupId: str('setupId'),
      notas: str('notas'),
    }
    const res = await fetch('/api/trading/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await res.json().catch(() => ({}))
    setGuardando(false)
    if (!res.ok) {
      setError(typeof j.error === 'string' ? j.error : 'Revisá los campos: faltan datos o el plan es incoherente')
      return
    }
    setAbriendo(false)
    router.refresh()
  }

  const borrar = async (id: string) => {
    await fetch(`/api/trading/trades?id=${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className='p-6 space-y-5 max-w-[1200px]'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='max-w-3xl'>
          <h1 className='text-lg font-semibold'>Diario</h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            Todo se mide en <strong>R</strong> (múltiplos de riesgo), no en dinero: así una operación grande y una chica son comparables. El
            riesgo se calcula contra el <strong>stop planificado</strong>, no contra el que hayas movido después — por eso mover el stop
            aparece acá como una pérdida mayor a 1R, que es lo que de verdad fue.
          </p>
        </div>
        <button
          onClick={() => setAbriendo(true)}
          className='inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90'>
          <Plus className='h-4 w-4' /> Registrar operación
        </button>
      </div>

      <div className='flex items-center gap-1'>
        {MODOS.map((m) => (
          <button
            key={m.key}
            onClick={() => setModo(m.key)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${modo === m.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>
            {m.label}
            <span className='ml-1.5 text-xs opacity-70'>{init.trades.filter((t) => t.mode === m.key).length}</span>
          </button>
        ))}
      </div>

      {!stats || stats.total === 0 ? (
        <div className='rounded-xl border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground'>
          Todavía no hay operaciones en <strong>{MODOS.find((m) => m.key === modo)?.label}</strong>. Cada operación que no registres es un
          dato que se pierde para siempre — es lo único que después puede decirte si tenés ventaja de verdad.
        </div>
      ) : (
        <>
          {/* La expectativa es EL número */}
          <div className='rounded-xl border-2 p-4' style={{ borderColor: stats.expectativa > 0 ? undefined : undefined }}>
            <div className='flex flex-wrap items-end justify-between gap-4'>
              <div>
                <div className='text-xs uppercase tracking-wide text-muted-foreground'>Expectativa por operación</div>
                <div
                  className={`text-4xl font-bold tabular-nums ${stats.expectativa > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {fmtR(stats.expectativa)}
                </div>
                <div className='text-xs text-muted-foreground mt-1'>
                  {stats.confiable ? (
                    <>Con {stats.cerradas} operaciones cerradas, la muestra ya dice algo.</>
                  ) : (
                    <span className='text-amber-600 dark:text-amber-500'>
                      Solo {stats.cerradas} de {MUESTRA_MINIMA} operaciones — todavía es ruido, no ventaja.
                    </span>
                  )}
                </div>
              </div>
              {stats.curva.length > 2 && (
                <div className='text-right'>
                  <div className='text-[10px] uppercase tracking-wide text-muted-foreground mb-1'>Curva de equity (R acumulado)</div>
                  <Sparkline data={stats.curva.map((p) => p.r)} stroke={stats.rTotal >= 0 ? '#2a78d6' : '#eb6834'} width={220} height={44} />
                </div>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
            <Metrica label='Aciertos' valor={`${(stats.aciertos * 100).toFixed(0)}%`} sub={`${stats.ganadas}G / ${stats.perdidas}P / ${stats.nulas}N`} />
            <Metrica
              label='Factor de beneficio'
              valor={stats.factorBeneficio > 0 ? stats.factorBeneficio.toFixed(2) : '—'}
              tono={stats.factorBeneficio > 1 ? 'bueno' : stats.factorBeneficio > 0 ? 'malo' : 'neutro'}
              sub='ganado / perdido'
            />
            <Metrica label='Ganancia media' valor={fmtR(stats.gananciaMediaR)} tono='bueno' />
            <Metrica label='Pérdida media' valor={`−${stats.perdidaMediaR.toFixed(2)}R`} tono='malo' />
            <Metrica label='Caída máxima' valor={`−${stats.drawdownMaxR.toFixed(2)}R`} sub={`racha: ${stats.rachaPerdedora} perdidas`} />
            <Metrica
              label='Disciplina'
              valor={stats.disciplina == null ? '—' : `${(stats.disciplina * 100).toFixed(0)}%`}
              tono={stats.disciplina != null && stats.disciplina >= 0.9 ? 'bueno' : stats.disciplina != null ? 'malo' : 'neutro'}
              sub='stops respetados'
            />
          </div>

          {/* Dónde está la ventaja */}
          <div className='grid gap-3 lg:grid-cols-2'>
            {([
              ['Por setup', cortes.setup],
              ['Por sesión', cortes.sesion],
              ['Por día de la semana', cortes.dia],
              ['Por instrumento', cortes.symbol],
            ] as const).map(([titulo, filas]) =>
              filas.length === 0 ? null : (
                <div key={titulo} className='rounded-xl border overflow-hidden'>
                  <div className='px-3 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide'>{titulo}</div>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b text-[10px] text-muted-foreground uppercase'>
                        <th className='text-left px-3 py-1.5 font-medium'></th>
                        <th className='text-right px-3 py-1.5 font-medium'>Ops</th>
                        <th className='text-right px-3 py-1.5 font-medium'>Aciertos</th>
                        <th className='text-right px-3 py-1.5 font-medium'>Expectativa</th>
                        <th className='text-right px-3 py-1.5 font-medium'>Total</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {filas.map((f) => (
                        <tr key={f.clave} className='hover:bg-muted/30'>
                          <td className='px-3 py-1.5 font-medium'>{f.etiqueta}</td>
                          <td className='px-3 py-1.5 text-right tabular-nums text-muted-foreground'>{f.stats.cerradas}</td>
                          <td className='px-3 py-1.5 text-right tabular-nums text-muted-foreground'>{(f.stats.aciertos * 100).toFixed(0)}%</td>
                          <td
                            className={`px-3 py-1.5 text-right tabular-nums font-medium ${f.stats.expectativa > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {fmtR(f.stats.expectativa)}
                          </td>
                          <td className='px-3 py-1.5 text-right tabular-nums text-muted-foreground'>{fmtR(f.stats.rTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </div>

          {/* Operaciones */}
          <div className='rounded-xl border overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide'>
                  <th className='text-left px-3 py-2 font-medium'>Fecha</th>
                  <th className='text-left px-3 py-2 font-medium'>Instrumento</th>
                  <th className='text-left px-3 py-2 font-medium'>Dir</th>
                  <th className='text-right px-3 py-2 font-medium'>Entrada</th>
                  <th className='text-right px-3 py-2 font-medium'>Stop</th>
                  <th className='text-right px-3 py-2 font-medium'>Salida</th>
                  <th className='text-right px-3 py-2 font-medium'>R</th>
                  <th className='text-left px-3 py-2 font-medium'>Setup</th>
                  <th className='text-left px-3 py-2 font-medium'>Sesión</th>
                  <th className='w-8'></th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {calculadas.map((t) => (
                  <tr key={t.id} className='hover:bg-muted/30 align-top'>
                    <td className='px-3 py-2 text-xs text-muted-foreground whitespace-nowrap'>
                      {t.entryAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className='px-3 py-2'>
                      <div className='font-medium'>{t.symbol}</div>
                      <div className='text-[10px] text-muted-foreground'>{t.timeframe}</div>
                    </td>
                    <td className='px-3 py-2'>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${t.direccion === 'long' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                        {t.direccion === 'long' ? 'Largo' : 'Corto'}
                      </span>
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>{fmtPrecio(t.entryPrice, t.symbol)}</td>
                    <td className='px-3 py-2 text-right tabular-nums text-muted-foreground'>{fmtPrecio(t.plannedStop, t.symbol)}</td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {t.exitPrice == null ? <span className='text-amber-600 dark:text-amber-500'>abierta</span> : fmtPrecio(t.exitPrice, t.symbol)}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${t.r == null ? 'text-muted-foreground' : t.r > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      {fmtR(t.r)}
                      {t.respetoStop === false && (
                        <div className='text-[9px] text-red-500 font-normal' title='La pérdida superó 1R: el stop no se respetó'>
                          stop no respetado
                        </div>
                      )}
                    </td>
                    <td className='px-3 py-2 text-xs text-muted-foreground'>{t.setupId ? setupNombre.get(t.setupId) ?? '—' : '—'}</td>
                    <td className='px-3 py-2 text-xs text-muted-foreground'>{SESION_LABEL[sesionDe(t.entryAt)]}</td>
                    <td className='px-2 py-2'>
                      <button onClick={() => borrar(t.id)} className='text-muted-foreground hover:text-red-500' title='Borrar'>
                        <Trash2 className='h-3.5 w-3.5' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Formulario */}
      {abriendo && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-6' onClick={() => setAbriendo(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            action={crear}
            className='bg-background rounded-xl border shadow-lg w-full max-w-2xl p-5 space-y-4 my-8'>
            <div className='flex items-center justify-between'>
              <h2 className='font-semibold'>Registrar operación · {MODOS.find((m) => m.key === modo)?.label}</h2>
              <button type='button' onClick={() => setAbriendo(false)} className='text-muted-foreground hover:text-foreground'>
                <X className='h-4 w-4' />
              </button>
            </div>

            <div>
              <div className='text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5'>El plan — antes de entrar</div>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                <label className='text-xs'>
                  Instrumento
                  <select name='symbol' required className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'>
                    {init.instrumentos.map((i) => (
                      <option key={i.symbol} value={i.symbol}>
                        {i.symbol}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='text-xs'>
                  Temporalidad
                  <select name='timeframe' defaultValue='h1' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'>
                    {TIMEFRAMES.map((t: Timeframe) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='text-xs'>
                  Dirección
                  <select name='direccion' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'>
                    <option value='long'>Largo</option>
                    <option value='short'>Corto</option>
                  </select>
                </label>
                <label className='text-xs'>
                  Riesgo %
                  <input name='riskPct' type='number' step='0.01' placeholder='1' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Entrada planificada *
                  <input name='plannedEntry' type='number' step='any' required className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Stop *
                  <input name='plannedStop' type='number' step='any' required className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Objetivo
                  <input name='plannedTarget' type='number' step='any' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Setup
                  <select name='setupId' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm'>
                    <option value=''>—</option>
                    {init.setups.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <div className='text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5'>La ejecución</div>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                <label className='text-xs'>
                  Fecha/hora entrada *
                  <input name='entryAt' type='datetime-local' required className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Precio de entrada
                  <input name='entryPrice' type='number' step='any' placeholder='= planificada' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Fecha/hora salida
                  <input name='exitAt' type='datetime-local' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Precio de salida
                  <input name='exitPrice' type='number' step='any' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Tamaño (unidades)
                  <input name='sizeUnits' type='number' step='any' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
                <label className='text-xs'>
                  Comisiones
                  <input name='fees' type='number' step='any' defaultValue='0' className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
                </label>
              </div>
              <p className='text-[10px] text-muted-foreground mt-1'>Dejá la salida vacía si la operación sigue abierta.</p>
            </div>

            <label className='text-xs block'>
              Notas — qué viste, qué sentiste, qué harías distinto
              <textarea name='notas' rows={3} className='mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm' />
            </label>

            {error && <p className='text-sm text-red-500'>{error}</p>}

            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => setAbriendo(false)} className='px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted'>
                Cancelar
              </button>
              <button
                type='submit'
                disabled={guardando}
                className='inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60'>
                {guardando && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
