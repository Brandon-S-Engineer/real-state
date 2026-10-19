import { redirect } from 'next/navigation'

// La portada del dashboard es Finanzas
export default function DashboardPage() {
  redirect('/dashboard/finanzas')
}
