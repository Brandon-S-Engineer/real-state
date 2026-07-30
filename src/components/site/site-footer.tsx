import Link from 'next/link'
import { site } from '@/content/site'

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      <div className='mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6 px-6 py-9'>
        <div>
          <p
            className='site-display text-[15px] font-semibold'
            style={{ color: 'var(--fg)' }}>
            {site.name}
          </p>
          <p
            className='mt-1 text-[13.5px]'
            style={{ color: 'var(--muted)' }}>
            {site.tagline}
          </p>
        </div>
        <div
          className='flex flex-wrap items-center gap-x-[22px] gap-y-2 text-[13.5px]'
          style={{ color: 'var(--muted)' }}>
          <Link
            href='/work'
            className='transition-colors hover:text-[var(--fg)]'>
            Work
          </Link>
          <Link
            href='/services'
            className='transition-colors hover:text-[var(--fg)]'>
            Services
          </Link>
          <Link
            href='/about'
            className='transition-colors hover:text-[var(--fg)]'>
            About
          </Link>
          <a
            href={site.upworkUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-[var(--fg)]'>
            Upwork
          </a>
          <a
            href={`mailto:${site.email}`}
            className='transition-colors hover:text-[var(--fg)]'>
            {site.email}
          </a>
        </div>
      </div>
      <div
        className='site-mono px-6 py-4 text-center text-[11.5px]'
        style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
        © {new Date().getFullYear()} {site.name} · Built with Next.js
      </div>
    </footer>
  )
}
