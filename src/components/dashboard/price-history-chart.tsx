'use client'

import { LineChart } from '@/components/dashboard/charts'

type Point = { date: string; price: number }

export default function PriceHistoryChart({ data }: { data: Point[] }) {
  return (
    <LineChart
      data={data}
      xKey='date'
      yKey='price'
      height={220}
      yFormatter={(v) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
    />
  )
}
