import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ApiKeysClient from '@/components/dashboard/api-keys-client'

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <ApiKeysClient />
}
