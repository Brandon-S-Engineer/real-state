import { prisma } from '@/lib/db'

const M2_MIN = 50
const M2_MAX = 450

function iqrFilter(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

export async function recalcularDealScores(): Promise<{ updated: number; oportunidades: number }> {
  // Todos los listings activos con precio
  const todos = await prisma.listing.findMany({
    where: { status: 'ACTIVE', price: { gt: 0 } },
    select: { id: true, zona: true, desarrollo: true, price: true, m2Constructed: true },
  })

  if (todos.length === 0) return { updated: 0, oportunidades: 0 }

  // Solo los que tienen m2 en rango válido entran al cálculo de promedios
  const conM2 = todos
    .filter((l) => l.m2Constructed != null && l.m2Constructed >= M2_MIN && l.m2Constructed <= M2_MAX)
    .map((l) => ({ ...l, pricePerM2: l.price / l.m2Constructed! }))

  // Promedios por zona con IQR
  const zonaRaw = new Map<string, number[]>()
  for (const l of conM2) {
    const arr = zonaRaw.get(l.zona) ?? []
    arr.push(l.pricePerM2)
    zonaRaw.set(l.zona, arr)
  }
  const zonaAvg = new Map<string, number>()
  for (const [zona, prices] of zonaRaw) {
    const clean = iqrFilter(prices)
    if (clean.length > 0) zonaAvg.set(zona, average(clean))
  }

  // Promedios por desarrollo con IQR (solo si ≥3 unidades)
  const desRaw = new Map<string, number[]>()
  for (const l of conM2) {
    if (!l.desarrollo) continue
    const key = `${l.zona}::${l.desarrollo}`
    const arr = desRaw.get(key) ?? []
    arr.push(l.pricePerM2)
    desRaw.set(key, arr)
  }
  const desAvg = new Map<string, number>()
  for (const [key, prices] of desRaw) {
    if (prices.length >= 3) {
      const clean = iqrFilter(prices)
      if (clean.length > 0) desAvg.set(key, average(clean))
    }
  }

  let oportunidades = 0

  // Actualizar todos los listings activos
  for (const l of todos) {
    const avgZona = zonaAvg.get(l.zona)
    const avgDes = l.desarrollo ? desAvg.get(`${l.zona}::${l.desarrollo}`) : undefined
    const avg = avgDes ?? avgZona

    const validM2 = l.m2Constructed != null && l.m2Constructed >= M2_MIN && l.m2Constructed <= M2_MAX
    const pricePerM2 = validM2 ? l.price / l.m2Constructed! : null
    const dealScore = pricePerM2 != null && avg != null
      ? ((avg - pricePerM2) / avg) * 100
      : null

    await prisma.listing.update({
      where: { id: l.id },
      data: {
        pricePerM2,
        zoneAvgPricePerM2: avg ?? null,
        dealScore,
      },
    })

    if (dealScore != null && dealScore >= 10) oportunidades++
  }

  return { updated: todos.length, oportunidades }
}
