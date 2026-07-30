// Central config for the public portfolio. Swap these placeholders for real
// links (Upwork profile, Calendly, email) — they drive every CTA on the site.

export const site = {
  name: 'Brandon Soria',
  role: 'Full-Stack & AI Engineer',
  // The 5-second hook. Speed + outcome, mirrors what high-budget Upwork
  // clients actually search for.
  tagline: 'Production-ready AI web apps in days, not months.',
  subhead:
    'I build MVPs, AI agents, and SaaS dashboards on Next.js — fixed price, fixed timeline, shipped fast.',
  location: 'Remote · Available worldwide',
  email: 'fortuneblue25@gmail.com',
  // Client-facing links — replace with your real URLs.
  upworkUrl: 'https://www.upwork.com/freelancers/~REPLACE_ME',
  calendlyUrl: 'https://calendly.com/REPLACE_ME/intro-call',
  // Social proof headline numbers (edit as they grow).
  stats: [
    { value: '5 days', label: 'Avg. time to first working MVP', accent: false },
    { value: 'Fixed', label: 'Price & timeline, always', accent: false },
    { value: '48h', label: 'From spec to live demo', accent: true },
  ],
  // Core stack shown as a trust strip on the home page.
  stack: [
    'Next.js',
    'React',
    'TypeScript',
    'Node.js',
    'OpenAI',
    'Claude',
    'Supabase',
    'Postgres',
    'Prisma',
    'Stripe',
    'Tailwind',
  ],
} as const

export type Site = typeof site
