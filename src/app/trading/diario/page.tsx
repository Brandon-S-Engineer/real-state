import { prisma } from '@/lib/db'
import DiarioClient, { type DiarioInit } from '@/components/trading/diario-client'
import { INSTRUMENTOS } from '@/content/trading-instruments'

export const dynamic = 'force-dynamic'

export default async function DiarioPage() {
  const [trades, setups] = await Promise.all([
    prisma.trade.findMany({ orderBy: { entryAt: 'desc' }, take: 2000 }),
    prisma.tradeSetup.findMany({ orderBy: { nombre: 'asc' } }),
  ])

  // Las fechas se serializan a ISO para cruzar al cliente; allá se rehidratan.
  const init: DiarioInit = {
    trades: trades.map((t) => ({
      ...t,
      entryAt: t.entryAt.toISOString(),
      exitAt: t.exitAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    setups: setups.map((s) => ({ id: s.id, nombre: s.nombre, reglas: s.reglas, activo: s.activo })),
    instrumentos: INSTRUMENTOS.map((i) => ({ symbol: i.symbol, nombre: i.nombre, digits: i.digits })),
  }

  return <DiarioClient init={init} />
}
