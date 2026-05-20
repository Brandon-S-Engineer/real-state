import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClientesClient from '@/components/dashboard/clientes-client'

export default async function ClientesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <ClientesClient />
}
