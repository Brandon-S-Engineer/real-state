import Link from 'next/link'
import { Activity, ArrowRight, Check, FileText } from 'lucide-react'
import HeroTerminal from '@/components/site/hero-terminal'
import ProjectCard from '@/components/site/project-card'
import { site } from '@/content/site'
import { featuredProjects } from '@/content/projects'

const steps = [
  {
    num: '01',
    icon: FileText,
    title: 'Share the spec',
    body: 'You send the scope — a doc, a Figma, or a rough idea. I turn it into a fixed price and timeline within hours.',
  },
  {
    num: '02',
    icon: Activity,
    title: 'Live demo in 48h',
    body: 'Before you commit, you get a working demo you can click — not a proposal full of promises.',
  },
  {
    num: '03',
    icon: Check,
    title: 'Ship & hand off',
    body: 'I build the rest, deploy it, and hand over clean code and docs. No lock-in, no surprises.',
  },
]

const testimonials = [
  {
    quote:
      'Had a clickable demo two days after our first message. Ended up shipping the full MVP in a week.',
    name: 'SaaS Founder',
    role: 'Seed-stage',
    initial: 'S',
  },
  {
    quote:
      'The chatbot dropped straight into our site and cut our support load immediately. Fast and clean.',
    name: 'Head of Ops',
    role: 'B2B agency',
    initial: 'H',
  },
]

const guarantees = [
  'Fixed price, fixed timeline',
  'First demo in 48 hours',
  'Clean, deployable code',
]

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className='mx-auto max-w-[1120px] px-6'>
        <div className='grid items-center gap-14 pt-[88px] pb-16 lg:grid-cols-[1.05fr_0.95fr]'>
          <div className='site-rise'>
            <span
              className='inline-flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-2.5 text-[12.5px]'
              style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)' }}>
              <span
                className='site-pulse h-[7px] w-[7px] rounded-full'
                style={{ background: 'var(--live)' }}
              />
              Available for new projects · {site.location}
            </span>
            <h1
              className='site-display mt-[22px] font-bold'
              style={{
                fontSize: 'clamp(40px,5.4vw,64px)',
                lineHeight: 1.02,
                letterSpacing: '-0.035em',
                textWrap: 'balance',
              }}>
              Production-ready AI web apps in{' '}
              <span style={{ color: 'var(--accent)' }}>days, not months.</span>
            </h1>
            <p
              className='mt-[22px] max-w-[32ch] text-[18.5px]'
              style={{ lineHeight: 1.55, color: 'var(--muted)', textWrap: 'pretty' }}>
              {site.subhead}
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Link
                href='/work'
                className='site-btn site-btn-accent h-12 px-[22px] text-[15.5px]'>
                See live demos
                <ArrowRight className='h-[17px] w-[17px]' />
              </Link>
              <a
                href={site.calendlyUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='site-btn site-btn-outline h-12 px-[22px] text-[15.5px]'>
                Book a call
              </a>
            </div>
          </div>

          <div className='site-rise-delay'>
            <HeroTerminal />
          </div>
        </div>

        {/* STATS */}
        <div className='grid grid-cols-1 gap-4 pb-3 sm:grid-cols-3'>
          {site.stats.map((s) => (
            <div
              key={s.label}
              className='rounded-2xl p-[26px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div
                className='site-display text-[34px] font-bold'
                style={{ letterSpacing: '-0.03em', color: s.accent ? 'var(--accent)' : 'var(--fg)' }}>
                {s.value}
              </div>
              <div className='mt-1.5 text-sm' style={{ color: 'var(--muted)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STACK STRIP */}
      <section
        className='mt-11'
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div className='mx-auto max-w-[1120px] px-6 py-[22px]'>
          <p className='site-kicker mb-4 text-center'>Built with a modern, production stack</p>
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

      {/* FEATURED WORK */}
      <section className='mx-auto max-w-[1120px] px-6 pt-[88px]'>
        <div className='flex items-end justify-between gap-6'>
          <div>
            <span className='site-kicker'>Selected work</span>
            <h2
              className='site-display mt-3 font-bold'
              style={{ fontSize: 'clamp(28px,3.4vw,38px)', letterSpacing: '-0.03em' }}>
              Real builds, not screenshots.
            </h2>
            <p className='mt-3 max-w-[46ch] text-[16.5px]' style={{ color: 'var(--muted)' }}>
              Nine interactive demos across chatbots, dashboards, and MVPs — the card previews are
              the actual products running. Click one and use it.
            </p>
          </div>
          <Link
            href='/work'
            className='shrink-0 pb-0.5 text-sm font-semibold'
            style={{ color: 'var(--fg)', borderBottom: '1px solid var(--accent)' }}>
            All 9 demos →
          </Link>
        </div>

        <div className='mt-9 grid grid-cols-1 gap-[18px] md:grid-cols-3'>
          {featuredProjects.map((p) => (
            <ProjectCard
              key={p.slug}
              project={p}
            />
          ))}
        </div>
      </section>

      {/* HOW I WORK */}
      <section
        className='mt-24'
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div className='mx-auto max-w-[1120px] px-6 py-20'>
          <div className='mx-auto max-w-[52ch] text-center'>
            <span className='site-kicker'>How I work</span>
            <h2
              className='site-display mt-3 font-bold'
              style={{ fontSize: 'clamp(28px,3.4vw,38px)', letterSpacing: '-0.03em' }}>
              You see something real before you commit.
            </h2>
            <p className='mt-3 text-[16.5px]' style={{ color: 'var(--muted)' }}>
              No long discovery phases. No proposals full of promises.
            </p>
          </div>
          <div className='mt-11 grid grid-cols-1 gap-[18px] md:grid-cols-3'>
            {steps.map((st) => (
              <div
                key={st.num}
                className='rounded-[18px] p-[26px]'
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className='flex items-center justify-between'>
                  <span
                    className='grid h-[42px] w-[42px] place-items-center rounded-[11px]'
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <st.icon className='h-5 w-5' />
                  </span>
                  <span className='site-mono text-xs' style={{ color: 'var(--muted)' }}>
                    {st.num}
                  </span>
                </div>
                <h3
                  className='site-display mt-5 text-lg font-semibold'
                  style={{ letterSpacing: '-0.02em' }}>
                  {st.title}
                </h3>
                <p className='mt-2.5 text-[14.5px]' style={{ lineHeight: 1.55, color: 'var(--muted)' }}>
                  {st.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className='mx-auto max-w-[1120px] px-6 pt-[88px]'>
        <div className='grid grid-cols-1 gap-[18px] md:grid-cols-2'>
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className='m-0 rounded-[18px] p-[30px]'
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div
                className='site-display text-[44px] leading-none'
                style={{ color: 'var(--accent)', opacity: 0.5 }}>
                “
              </div>
              <blockquote
                className='mt-1.5 text-[19px]'
                style={{ lineHeight: 1.5, letterSpacing: '-0.01em', textWrap: 'pretty' }}>
                {t.quote}
              </blockquote>
              <figcaption className='mt-5 flex items-center gap-3'>
                <span
                  className='site-display grid h-[38px] w-[38px] place-items-center rounded-full text-sm font-semibold'
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {t.initial}
                </span>
                <span className='text-[13.5px]' style={{ color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{t.name}</span> · {t.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className='mx-auto max-w-[1120px] px-6 pt-[88px] pb-24'>
        <div
          className='relative overflow-hidden rounded-[26px] px-12 py-16 text-center'
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
              Have a project with a clear scope?
            </h2>
            <p className='mx-auto mt-[18px] max-w-[48ch] text-[17px]' style={{ lineHeight: 1.55, opacity: 0.72 }}>
              Send it over. You’ll get a fixed price, a timeline, and — for the right fit — a working
              demo within 48 hours.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-3'>
              <a
                href={site.calendlyUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='site-btn site-btn-accent h-[50px] px-[26px] text-[15.5px]'>
                Book a call
              </a>
              <a
                href={site.upworkUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='site-btn h-[50px] px-[26px] text-[15.5px]'
                style={{
                  background: 'transparent',
                  color: 'var(--bg)',
                  border: '1px solid color-mix(in oklch, var(--bg) 40%, transparent)',
                }}>
                Hire me on Upwork
              </a>
            </div>
            <div className='mt-[34px] flex flex-wrap justify-center gap-x-[26px] gap-y-3'>
              {guarantees.map((g) => (
                <span
                  key={g}
                  className='inline-flex items-center gap-2 text-[13.5px]'
                  style={{ opacity: 0.8 }}>
                  <Check className='h-[15px] w-[15px]' style={{ color: 'var(--live)' }} />
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
