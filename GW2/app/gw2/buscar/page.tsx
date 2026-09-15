import { prisma } from '@/lib/db'
import Gw2MarketExplorerClient from '@/components/dashboard/gw2-market-explorer-client'

export default async function Gw2BuscarPage() {
  const [itemCount, lastRun] = await Promise.all([
    prisma.gw2Item.count(),
    prisma.gw2ItemSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
  ])

  return (
    <div className='p-6 space-y-4'>
      <div>
        <h1 className='text-lg font-semibold'>Buscar ítem</h1>
        <p className='text-sm text-muted-foreground mt-0.5'>
          Precio y volumen real de cualquier ítem tradeable. {itemCount.toLocaleString('es-MX')} ítems en cache
          {lastRun ? ` · última sync ${new Date(lastRun.startedAt).toLocaleDateString('es-MX')}` : ''}.
        </p>
      </div>
      <Gw2MarketExplorerClient />
    </div>
  )
}
