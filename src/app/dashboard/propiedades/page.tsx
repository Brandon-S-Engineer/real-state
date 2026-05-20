import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PropiedadesTable, { type Listing } from '@/components/dashboard/propiedades-table'

export default async function PropiedadesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const rows = await prisma.listing.findMany({
    orderBy: [{ dealScore: 'desc' }, { firstSeenAt: 'desc' }],
    select: {
      id: true, sourceId: true, sourceUrl: true, title: true,
      zona: true, desarrollo: true, price: true,
      m2Constructed: true, bedrooms: true, bathrooms: true, parkingSpaces: true,
      pricePerM2: true, zoneAvgPricePerM2: true, dealScore: true,
      status: true, notes: true, amenities: true,
      firstSeenAt: true, lastSeenAt: true,
    },
  })

  const listings: Listing[] = rows.map((r) => ({
    ...r,
    amenities: Array.isArray(r.amenities) ? (r.amenities as string[]) : [],
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt:  r.lastSeenAt.toISOString(),
  }))

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-xl font-semibold'>Propiedades</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          {listings.length} propiedad{listings.length !== 1 ? 'es' : ''} en la base de datos
        </p>
      </div>
      <PropiedadesTable listings={listings} />
    </div>
  )
}
