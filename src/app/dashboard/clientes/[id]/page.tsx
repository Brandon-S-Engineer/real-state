import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClienteDetailClient from '@/components/dashboard/cliente-detail-client'

type Params = { params: Promise<{ id: string }> }

export default async function ClienteDetailPage({ params }: Params) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  return <ClienteDetailClient id={id} />
}
