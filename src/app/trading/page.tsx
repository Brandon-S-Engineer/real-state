import Link from 'next/link'
import { INSTRUMENTOS } from '@/content/trading-instruments'
import { getCobertura } from '@/lib/trading/bars'

export const dynamic = 'force-dynamic'

const CLASE_LABEL: Record<string, string> = {
  forex: 'Forex',
  metal: 'Metales',
  energia: 'Energía',
  indice: 'Índices',
  accion: 'Acciones',
}

function fmtFecha(ms: number | null) {
  return ms ? new Date(ms).toISOString().slice(0, 10) : '—'
}

export default async function TradingPage() {
  // Lee el disco local; barato (un count por símbolo sobre Parquet).
  const cobertura = await Promise.all(INSTRUMENTOS.map((i) => getCobertura(i.symbol)))
  const porSymbol = new Map(cobertura.filter((c) => c !== null).map((c) => [c!.symbol, c!]))

  const totalVelas = cobertura.reduce((s, c) => s + (c?.velas ?? 0), 0)
  const conDatos = cobertura.filter((c) => (c?.velas ?? 0) > 0).length

  const grupos = Object.entries(
    INSTRUMENTOS.reduce<Record<string, typeof INSTRUMENTOS>>((acc, i) => {
      ;(acc[i.clase] ||= []).push(i)
      return acc
    }, {}),
  )

  return (
    <div className='p-6 space-y-5 max-w-[1100px]'>
      <div className='max-w-3xl'>
        <h1 className='text-lg font-semibold'>Mercados</h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          Velas de 1 minuto guardadas en disco (Parquet + DuckDB), no en la base. Todas las temporalidades se derivan del M1, así que
          nunca hay dos versiones del mismo mercado. Descargá con{' '}
          <code className='text-[11px] bg-muted px-1 py-0.5 rounded'>npm run trading:fetch -- --symbol EURUSD --from 2020</code>.
        </p>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
        <div className='rounded-xl border p-3'>
          <div className='text-xs text-muted-foreground'>Instrumentos con datos</div>
          <div className='text-2xl font-bold tabular-nums'>
            {conDatos}
            <span className='text-base font-normal text-muted-foreground'> / {INSTRUMENTOS.length}</span>
          </div>
        </div>
        <div className='rounded-xl border p-3'>
          <div className='text-xs text-muted-foreground'>Velas M1 en disco</div>
          <div className='text-2xl font-bold tabular-nums'>{totalVelas.toLocaleString('es-MX')}</div>
        </div>
        <div className='rounded-xl border p-3'>
          <div className='text-xs text-muted-foreground'>Fuente</div>
          <div className='text-sm font-medium mt-1'>Dukascopy — gratis, sin API key</div>
        </div>
      </div>

      {grupos.map(([clase, items]) => (
        <div key={clase} className='rounded-xl border overflow-hidden'>
          <div className='px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-foreground/80'>{CLASE_LABEL[clase] ?? clase}</div>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-xs text-muted-foreground uppercase tracking-wide'>
                <th className='text-left px-4 py-2 font-medium'>Instrumento</th>
                <th className='text-right px-4 py-2 font-medium'>Velas M1</th>
                <th className='text-right px-4 py-2 font-medium whitespace-nowrap'>Rango en disco</th>
                <th className='text-right px-4 py-2 font-medium whitespace-nowrap'>M1 disponible desde</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {items.map((i) => {
                const c = porSymbol.get(i.symbol)
                const tiene = (c?.velas ?? 0) > 0
                return (
                  <tr key={i.symbol} className='hover:bg-muted/40'>
                    <td className='px-4 py-2.5'>
                      <Link href={`/trading/chart/${i.symbol}`} className='block'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>{i.symbol}</span>
                          <span className='text-xs text-muted-foreground'>{i.nombre}</span>
                          {!tiene && <span className='text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>sin descargar</span>}
                          {i.historialDudoso && (
                            <span
                              title='Dukascopy declara M1 desde 2000, pero es un placeholder: se asume 2017'
                              className='text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'>
                              historial dudoso
                            </span>
                          )}
                        </div>
                        <div className='text-xs text-muted-foreground mt-0.5 max-w-xl leading-snug'>{i.tesis}</div>
                      </Link>
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums'>{tiene ? c!.velas.toLocaleString('es-MX') : '—'}</td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground whitespace-nowrap'>
                      {tiene ? `${fmtFecha(c!.desde)} → ${fmtFecha(c!.hasta)}` : '—'}
                    </td>
                    <td className='px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground'>{i.m1Desde}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
