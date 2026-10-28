import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ResaleIntel from '@/components/site/resale/resale-intel'
import { getMarketSnapshot } from '@/lib/resale/market'

export const metadata: Metadata = {
  title: 'Resale Intelligence — Brandon Soria',
  description: 'A live price model and multi-agent deal desk built on real Facebook Marketplace data for my used-Apple resale business.',
}

export const revalidate = 1800

export default async function ResalePage() {
  const snapshot = await getMarketSnapshot()
  return (
    <section className='mx-auto max-w-[1120px] px-6 pt-12 pb-24'>
      <Link href='/#products' className='inline-flex items-center gap-1.5 text-[13.5px]' style={{ color: 'var(--muted)' }}>
        <ArrowLeft className='h-4 w-4' /> Back to portfolio
      </Link>
      <span className='site-kicker mt-6 block'>Product 1/2 · runs my resale business</span>
      <h1 className='site-display mt-2 font-bold' style={{ fontSize: 'clamp(30px,4vw,44px)', letterSpacing: '-0.035em' }}>
        Resale Intelligence
      </h1>
      <div className='mt-5'>
        <ResaleIntel snapshot={snapshot} />
      </div>
    </section>
  )
}
