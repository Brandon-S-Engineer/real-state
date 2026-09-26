import { redirect } from 'next/navigation'

// La sección se dividió en MacBook e iPhone; se conserva la URL vieja.
export default async function ElectronicosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  redirect(`/dashboard/macbook${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`)
}
