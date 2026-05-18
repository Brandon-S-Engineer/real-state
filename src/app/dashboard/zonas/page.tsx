import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ZonasClient from '@/components/dashboard/zonas-client'

export default async function ZonasPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <ZonasClient />
}
