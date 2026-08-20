import type { WeeklyStat } from '@/lib/gw2/weekly-cycle'

export function WeekBars({ stat }: { stat: WeeklyStat }) {
  const maxAbs = Math.max(...stat.byDow.map((d) => Math.abs(d.avgDevPct)), 0.0001)
  return (
    <div className='flex items-end gap-1 h-14'>
      {stat.byDow.map((d) => {
        const isCheap = d.dow === stat.cheapestDow
        const isRich = d.dow === stat.richestDow
        const h = Math.round((Math.abs(d.avgDevPct) / maxAbs) * 24) // px desde la línea cero
        const color = isCheap ? 'bg-emerald-500' : isRich ? 'bg-amber-500' : 'bg-muted-foreground/30'
        return (
          <div key={d.dow} className='flex-1 flex flex-col items-center' title={`${d.label}: ${d.avgDevPct >= 0 ? '+' : ''}${(d.avgDevPct * 100).toFixed(2)}% (${d.samples} muestras)`}>
            {/* mitad de arriba: días caros crecen hacia arriba */}
            <div className='h-6 w-full flex items-end justify-center'>
              {d.avgDevPct > 0 && <div className={`w-full rounded-t ${color}`} style={{ height: `${h}px` }} />}
            </div>
            {/* mitad de abajo: días baratos crecen hacia abajo */}
            <div className='h-6 w-full flex items-start justify-center border-t border-border'>
              {d.avgDevPct < 0 && <div className={`w-full rounded-b ${color}`} style={{ height: `${h}px` }} />}
            </div>
            <div className={`text-[9px] mt-0.5 ${isCheap ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : isRich ? 'text-amber-600 dark:text-amber-500 font-semibold' : 'text-muted-foreground'}`}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function ConsistencyDot({ v }: { v: number }) {
  const color = v >= 0.65 ? 'bg-emerald-500' : v >= 0.55 ? 'bg-amber-500' : 'bg-red-500'
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}
