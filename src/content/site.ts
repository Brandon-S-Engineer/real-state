// Central config for the public portfolio. Swap these placeholders for real
// links (Upwork profile, Calendly, email) — they drive every CTA on the site.

export const site = {
  name: 'Brandon Soria',
  role: 'Full-Stack & AI Engineer',
  // The 5-second hook. Speed + outcome, mirrors what high-budget Upwork
  // clients actually search for.
  tagline: 'Production-ready AI web apps in days, not months.',
  subhead:
    'From simple automations to multi-agent systems — fixed price, fixed timeline, and a live demo of every level you can try right here.',
  location: 'Remote · Available worldwide',
  email: 'fortuneblue25@gmail.com',
  // Client-facing links — replace with your real URLs.
  upworkUrl: 'https://www.upwork.com/freelancers/~REPLACE_ME',
  calendlyUrl: 'https://calendly.com/REPLACE_ME/intro-call',
  // Core stack shown as a trust strip on the home page — AI first.
  stack: [
    'Python',
    'FastAPI',
    'Pydantic AI',
    'OpenAI',
    'Claude',
    'pgvector',
    'n8n',
    'Next.js',
    'TypeScript',
    'Postgres',
    'Stripe',
  ],
} as const

export type Site = typeof site
