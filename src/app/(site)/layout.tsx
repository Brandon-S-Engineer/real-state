import type { Metadata } from 'next'
import { Space_Grotesk, Onest, JetBrains_Mono } from 'next/font/google'
import SiteNav from '@/components/site/site-nav'
import SiteFooter from '@/components/site/site-footer'
import { site } from '@/content/site'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})
const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-onest',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description: site.subhead,
  openGraph: {
    title: `${site.name} — ${site.role}`,
    description: site.subhead,
    type: 'website',
  },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${spaceGrotesk.variable} ${onest.variable} ${jetbrainsMono.variable} site-theme flex min-h-screen flex-col`}>
      <SiteNav />
      <main className='flex-1'>{children}</main>
      <SiteFooter />
    </div>
  )
}
