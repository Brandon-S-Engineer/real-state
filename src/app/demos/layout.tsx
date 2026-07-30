import { Space_Grotesk, Onest, JetBrains_Mono } from 'next/font/google'

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

// Demos are standalone product surfaces: they get the portfolio fonts but NOT
// the site chrome or theme — each demo owns its look, like a real client app.
export default function DemosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${spaceGrotesk.variable} ${onest.variable} ${jetbrainsMono.variable} min-h-screen`}
      style={{ fontFamily: 'var(--font-onest), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
