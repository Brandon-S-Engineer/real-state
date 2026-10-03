import Link from 'next/link'
import { ArrowDown, ArrowRight, Check, FileText, MousePointerClick, Rocket } from 'lucide-react'
import HomeLadder from '@/components/site/home-ladder'
import OtherServices from '@/components/site/other-services'
import { site } from '@/content/site'
import { getLadderItems } from '@/content/services'

const steps = [
  {
    num: '01',
    icon: FileText,
    title: 'Describe the problem',
    body: 'Tell me what’s eating your team’s time. I’ll tell you the lowest level that solves it — with a fixed scope and timeline.',
  },
  {
    num: '02',
    icon: MousePointerClick,
    title: 'See it working in 48h',
    body: 'The first milestone is a working demo you can click — not a document full of promises.',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Ship & hand off',
    body: 'I build the rest, deploy it, and hand over clean code and docs. You own everything — no lock-in.',
  },
]

const guarantees = ['Fixed scope, fixed timeline', 'First demo in 48 hours', 'Clean code you own']

export default function HomePage() {
  const items = getLadderItems()

  const intro = (
    <div className='site-rise'>
      <span
        className='inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-2.5 text-[12.5px]'
        style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)' }}>
        <span className='site-pulse h-[7px] w-[7px] rounded-full' style={{ background: 'var(--live)' }} />
        Open for new projects · {site.location}
      </span>
      <h1
        className='site-display mt-[22px] font-bold'
        style={{
          fontSize: 'clamp(40px,5.4vw,64px)',
          lineHeight: 1.02,
          letterSpacing: '-0.035em',
          textWrap: 'balance',
        }}>
        AI that does real work{' '}
        <span style={{ color: 'var(--accent)' }}>in your business.</span>
      </h1>
      <p
        className='mt-[22px] max-w-[40ch] text-[18.5px]'
        style={{ lineHeight: 1.55, color: 'var(--muted)', textWrap: 'pretty' }}>
        {site.subhead}
      </p>
      <div className='mt-8 flex flex-wrap gap-3'>
        <a href='#demos' className='site-btn site-btn-accent h-12 px-[22px] text-[15.5px]'>
          Try the live demos
          <ArrowDown className='h-[17px] w-[17px]' />
        </a>
        <Link href='/demos' className='site-btn site-btn-outline h-12 px-[22px] text-[15.5px]'>
          All demos
        </Link>
      </div>
      <div className='mt-6 flex flex-wrap gap-x-5 gap-y-2'>
        {guarantees.map((g) => (
          <span key={g} className='inline-flex items-center gap-1.5 text-[13.5px]' style={{ color: 'var(--muted)' }}>
            <Check className='h-3.5 w-3.5' style={{ color: 'var(--live)' }} strokeWidth={2.8} />
            {g}
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* HERO + LIVE DEMO STAGE */}
      <section className='mx-auto max-w-[1120px] px-6'>
        <HomeLadder intro={intro} items={items} />
      </section>

      {/* STACK STRIP */}
      <section
        className='mt-24'
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div className='mx-auto max-w-[1120px] px-6 py-[22px]'>
          <p className='site-kicker mb-4 text-center'>Built with a production AI stack</p>
          <div
            className='overflow-hidden'
            style={{ maskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
            <div className='site-marquee flex w-max gap-11'>
              {[...site.stack, ...site.stack].map((s, i) => (
                <span
                  key={i}
                  className='site-mono text-sm font-medium whitespace-nowrap'
                  style={{ color: 'var(--muted)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW I WORK */}
      <section className='mx-auto max-w-[1120px] px-6 pt-24'>
        <div className='max-w-[52ch]'>
          <span className='site-kicker'>How I work</span>
          <h2
            className='site-display mt-3 font-bold'
            style={{ fontSize: 'clamp(24px,3vw,30px)', letterSpacing: '-0.03em' }}>
            You see something real from day two.
          </h2>
        </div>
        <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
          {steps.map((st) => (
            <div
              key={st.num}
              className='rounded-[18px] p-[22px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className='flex items-center justify-between'>
                <span
                  className='grid h-[38px] w-[38px] place-items-center rounded-[10px]'
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <st.icon className='h-[18px] w-[18px]' />
                </span>
                <span className='site-mono text-xs' style={{ color: 'var(--muted)' }}>
                  {st.num}
                </span>
              </div>
              <h3 className='site-display mt-4 text-[18px] font-semibold' style={{ letterSpacing: '-0.02em' }}>
                {st.title}
              </h3>
              <p className='mt-2 text-[14px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                {st.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ALSO AVAILABLE */}
      <section className='mx-auto max-w-[1120px] px-6 pt-20'>
        <OtherServices />
      </section>

      {/* FINAL CTA */}
      <section className='mx-auto max-w-[1120px] px-6 pt-20 pb-24'>
        <div
          className='relative overflow-hidden rounded-[26px] px-8 py-14 text-center sm:px-12 sm:py-16'
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
          <div
            className='absolute inset-0'
            style={{
              background: 'radial-gradient(60% 120% at 50% -10%, var(--accent-soft), transparent)',
              opacity: 0.9,
            }}
          />
          <div className='relative'>
            <h2
              className='site-display font-bold'
              style={{ fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '-0.03em', textWrap: 'balance' }}>
              Have a process AI should be handling?
            </h2>
            <p className='mx-auto mt-[18px] max-w-[48ch] text-[17px]' style={{ lineHeight: 1.55, opacity: 0.72 }}>
              Describe it in your message. You’ll get the right level, a fixed scope and a timeline —
              and a first working demo within 48 hours of starting.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-3'>
              <a href='#demos' className='site-btn site-btn-accent h-[50px] px-[26px] text-[15.5px]'>
                Try the live demos
                <ArrowDown className='h-[17px] w-[17px]' />
              </a>
              <Link
                href='/services'
                className='site-btn h-[50px] px-[26px] text-[15.5px]'
                style={{
                  background: 'transparent',
                  color: 'var(--bg)',
                  border: '1px solid color-mix(in oklch, var(--bg) 40%, transparent)',
                }}>
                Compare the levels
                <ArrowRight className='h-[17px] w-[17px]' />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
