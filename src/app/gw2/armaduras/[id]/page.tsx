import ArmaduraDetailClient from '@/components/gw2/armadura-detail-client'

export default async function ArmaduraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ArmaduraDetailClient itemId={Number(id)} />
}
