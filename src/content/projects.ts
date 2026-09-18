// Portfolio case studies, grouped by category (clients always ask to see 2-3
// examples of the exact thing they need — every category ships 3 distinct,
// interactive demos). Static + typed; no DB.
//
// Catalog grounded in analysis of 351 real captured Upwork jobs (2026-07):
// among score>=7 jobs — 81% integration, 61% Stripe/payments, 58% LLM/RAG,
// 48% each dashboard/SaaS/MVP, 23% booking. The recurring winning shape is
// "AI SaaS: input → LLM → valuable output, with billing".

export type DemoStatus = 'live' | 'coming-soon'
export type Category = 'chatbot' | 'dashboard' | 'mvp'

export const CATEGORIES: { id: Category; title: string; blurb: string }[] = [
  {
    id: 'chatbot',
    title: 'AI Chatbots & Agents',
    blurb:
      'Assistants that answer from your data, sell, and book — embeddable anywhere, with human handoff.',
  },
  {
    id: 'dashboard',
    title: 'SaaS Dashboards & Internal Tools',
    blurb:
      'Admin panels, CRMs, and AI-powered ops tools your team actually enjoys using.',
  },
  {
    id: 'mvp',
    title: 'MVPs — Idea to Paying Product',
    blurb:
      'Full products with Stripe billing, shipped in about a week. Real checkout, real users.',
  },
]

export type Project = {
  slug: string
  title: string
  tagline: string
  niche: string
  category: Category
  // True when the build includes Stripe billing/checkout — shown on cards.
  stripe: boolean
  clientType: string
  problem: string
  scope: string[]
  stack: string[]
  timeToBuild: string
  duration: string
  outcome: string
  tags: string[]
  demoStatus: DemoStatus
  demoUrl?: string
  loomUrl?: string
  featured: boolean
  // Position on a category's complexity ladder (currently only "chatbot" is
  // being rebuilt this way — cheap/simple at tier 1, advanced/expensive at
  // tier 4). Undefined for categories/projects not yet on a ladder.
  tierLevel?: 1 | 2 | 3 | 4
  tierLabel?: string
}

export const projects: Project[] = [
  // ── AI Chatbots & Agents (complexity ladder, tier 1 → 4) ──────────────────
  {
    slug: 'lead-to-crm-automation',
    title: 'Lead-to-CRM Automation',
    tagline:
      'Every lead captured, validated, saved, and answered automatically — and if a step fails, it retries and alerts a human instead of dying silently.',
    niche: 'Automation · trigger → action (no AI)',
    category: 'chatbot',
    stripe: false,
    clientType: 'A real-estate agency drowning in manual lead handling',
    problem:
      'Every lead was copied by hand into the CRM and the team pinged manually about it — slow, error-prone, and leads slipped through the cracks entirely.',
    scope: [
      'End-to-end flow: lead received → validated → saved to CRM → team notified → welcome email sent',
      'Field validation before anything touches the CRM, so garbage submissions never pollute the pipeline',
      'Automatic retries on every step — a flaky API or a dropped connection resolves itself, invisibly',
      'Escalates to a human alert if retries run out, so a failure is loud instead of silent',
      'Runs on a webhook trigger, 24/7 — no polling, no manual entry, no missed leads',
    ],
    stack: ['n8n', 'Webhooks', 'Postgres', 'Error handling'],
    timeToBuild: 'Shipped in 2 days',
    duration: '2 days',
    outcome:
      'Went from manual entry and lost leads to zero-loss, instant, 24/7 lead response.',
    tags: ['automation', 'n8n', 'lead capture', 'CRM integration', 'webhooks', 'error handling', 'real estate'],
    demoStatus: 'live',
    demoUrl: '/demos/lead-to-crm-automation',
    featured: false,
    tierLevel: 1,
    tierLabel: 'Pure automation (no AI)',
  },
  {
    slug: 'smart-inbox-router',
    title: 'Smart Inbox Router',
    tagline:
      'An LLM reads every incoming message, classifies it into clean structured fields, and routes it — with a rules-based fallback if the model ever misbehaves.',
    niche: 'Automation + LLM reasoning',
    category: 'chatbot',
    stripe: false,
    clientType: 'A business whose team manually triages a flood of mixed incoming messages',
    problem:
      'Someone had to read every incoming message and decide where it went — hours a day, inconsistent between people, and slow to respond to anything urgent.',
    scope: [
      'LLM reads every incoming message and returns a clean, structured classification — category, urgency, sentiment, and a one-line summary',
      'No tools, no actions taken by the model — it only judges, so its blast radius is small and its output is predictable',
      'Schema-validated output with an automatic retry on a malformed response',
      'Deterministic keyword-based fallback routes the message anyway if the model still can’t produce valid structure — degrades gracefully instead of breaking',
      'Routes each message to the right queue automatically — support, sales, billing, or an escalation — based on the classification',
    ],
    stack: ['n8n', 'OpenAI', 'Webhooks'],
    timeToBuild: 'Shipped in 3 days',
    duration: '3 days',
    outcome:
      'Instant, consistent triage — the team only sees what’s theirs, already summarized.',
    tags: ['automation', 'LLM classification', 'triage', 'n8n', 'OpenAI', 'structured output', 'inbox routing'],
    demoStatus: 'live',
    demoUrl: '/demos/smart-inbox-router',
    featured: false,
    tierLevel: 2,
    tierLabel: 'AI-assisted automation (LLM judges)',
  },
  {
    slug: 'ai-inventory-assistant',
    title: 'AI Inventory Assistant with Real Function-Calling',
    tagline:
      'An agent that actually calls a search tool over live inventory — not a scripted FAQ bot.',
    niche: 'AI agents + LLM function-calling (structured data search)',
    category: 'chatbot',
    stripe: false,
    clientType: 'A multi-brand car dealership with a messy, real-world inventory feed',
    problem:
      'Staff spent hours a day answering "do you have anything blue" by scrolling a spreadsheet where the same blue shows up as a dozen different factory paint names across brands. The client wanted customers to just ask, in plain language, and get a real answer from live stock.',
    scope: [
      'LLM agent with a real search_inventory function tool — not string-matched FAQs',
      'Color-synonym resolution across dozens of real factory paint names per hue',
      'Brand-tab and reserved-unit filtering handled inside the tool call',
      'Tool-call trace visible in the chat, so the logic is auditable, not a black box',
      'Same pattern extends to any structured catalog: parts, units, rooms, appointments',
    ],
    stack: ['Next.js', 'TypeScript', 'OpenAI function calling', 'Postgres', 'Prisma', 'Tailwind'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'Cut "do you have X in stock" questions from a staff task to a 10-second self-serve answer, around the clock.',
    tags: ['AI agent', 'function calling', 'tool use', 'LLM integration', 'structured search', 'OpenAI', 'inventory'],
    demoStatus: 'live',
    demoUrl: '/demos/ai-inventory-assistant',
    featured: true,
  },
  {
    slug: 'ai-sales-chatbot',
    title: 'AI Sales Assistant for E-commerce',
    tagline:
      'A shop assistant that recommends products, answers sizing questions, and closes the sale with Stripe.',
    niche: 'AI agents + e-commerce + Stripe',
    category: 'chatbot',
    stripe: true,
    clientType: 'E-commerce brands whose visitors leave without asking anyone anything',
    problem:
      'The store converted browsers poorly: shoppers had questions no FAQ answered, and product discovery was scroll-and-hope. The client wanted a sales associate experience — recommend, reassure, and check out — inside the chat.',
    scope: [
      'Conversational product recommendations from the live catalog',
      'Add-to-cart and Stripe checkout without leaving the chat',
      'Policy answers (shipping, returns) grounded in store docs',
      'Cart-aware upsells and bundle suggestions',
      'Analytics on questions that lose sales',
    ],
    stack: ['Next.js', 'TypeScript', 'OpenAI', 'Stripe', 'Postgres', 'Tailwind'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'Chat-assisted sessions convert at a multiple of unassisted ones — the bot pays for itself.',
    tags: ['AI agent', 'e-commerce', 'Stripe', 'chatbot', 'product recommendations', 'checkout'],
    demoStatus: 'live',
    demoUrl: '/demos/ai-sales-chatbot',
    featured: false,
  },
  {
    slug: 'ai-booking-agent',
    title: 'AI Booking Agent',
    tagline:
      'A conversational agent that qualifies the visitor, offers real slots, and books the appointment.',
    niche: 'AI agents + booking/scheduling + automation',
    category: 'chatbot',
    stripe: false,
    clientType: 'Clinics, studios, and consultants losing bookings to phone tag',
    problem:
      'Every missed call was a lost appointment. The client wanted visitors to book themselves — but through a guided conversation that picks the right service and time, not a bare calendar grid.',
    scope: [
      'Guided conversation: provider → service → date → time → patient info → confirmed',
      'Live availability from the business calendar, per provider',
      'Instant confirmation with calendar invite',
      'Reschedule and cancellation handled entirely inside the chat — no phone call needed',
      'No-show reduction via reminder automation',
    ],
    stack: ['Next.js', 'TypeScript', 'Claude', 'Postgres', 'Google Calendar API', 'Tailwind'],
    timeToBuild: 'Shipped in 4 days',
    duration: '4 days',
    outcome:
      'Bookings happen 24/7 without a receptionist — including the ones that used to be missed calls.',
    tags: ['AI agent', 'booking', 'scheduling', 'automation', 'calendar integration', 'chatbot'],
    demoStatus: 'live',
    demoUrl: '/demos/ai-booking-agent',
    featured: false,
  },

  // ── SaaS Dashboards & Internal Tools ──────────────────────────────────────
  {
    slug: 'saas-analytics-dashboard',
    title: 'SaaS Analytics Dashboard',
    tagline:
      'A production-grade admin panel: auth, real-time charts, and CRUD your team actually enjoys using.',
    niche: 'SaaS + dashboard (visual)',
    category: 'dashboard',
    stripe: false,
    clientType: 'Early-stage SaaS founders who need an internal/admin dashboard yesterday',
    problem:
      'The client had data everywhere and no single place to see it. They needed a clean, fast dashboard with role-based access — not a six-week build.',
    scope: [
      'Authentication with role-based access control',
      'Live KPI cards, charts, and filterable data tables',
      'Full CRUD with optimistic updates and toasts',
      'Responsive, dark/light, keyboard-friendly',
      'Deployable in one click on Vercel',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Prisma', 'Postgres', 'Tailwind', 'shadcn/ui'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'Replaced a tangle of spreadsheets with one dashboard the whole team logs into daily.',
    tags: ['SaaS', 'dashboard', 'admin panel', 'analytics', 'charts', 'CRUD', 'Next.js'],
    demoStatus: 'live',
    demoUrl: '/demos/saas-analytics-dashboard',
    featured: true,
  },
  {
    slug: 'ai-real-estate-crm',
    title: 'AI Real-Estate CRM & Lead Scoring',
    tagline:
      'A pipeline CRM that scores every lead with AI and drafts the follow-up before the agent opens the app.',
    niche: 'AI agents + automation + SaaS (vertical CRM)',
    category: 'dashboard',
    stripe: false,
    clientType: 'Real-estate teams losing leads because follow-up depends on memory',
    problem:
      'Leads arrived from portals, WhatsApp, and web forms into a spreadsheet nobody maintained. Hot leads went cold. The client wanted one pipeline with automatic scoring and next-action suggestions.',
    scope: [
      'Kanban pipeline with stage management',
      'AI lead scoring from source, budget, and behaviour signals',
      'Auto-drafted follow-up messages for each lead',
      'Zone-level view: listings, counts, and average price per area',
      'Multi-channel publisher — one click posts a listing to the website, Facebook Marketplace, and Instagram via each platform’s API',
    ],
    stack: ['Next.js', 'TypeScript', 'Claude', 'Prisma', 'Postgres', 'Tailwind', 'shadcn/ui'],
    timeToBuild: 'Shipped in 6 days',
    duration: '6 days',
    outcome:
      'Every lead gets scored and a drafted reply within seconds of arriving — nothing falls through.',
    tags: ['CRM', 'AI agent', 'lead scoring', 'automation', 'SaaS', 'real estate', 'dashboard'],
    demoStatus: 'live',
    demoUrl: '/demos/ai-real-estate-crm',
    featured: false,
  },
  {
    slug: 'ai-document-extractor',
    title: 'Document AI — PDF to Structured Data',
    tagline:
      'Upload messy documents, get clean JSON: invoices, contracts, and forms parsed by an LLM pipeline.',
    niche: 'LLM API + automation (document processing / OCR)',
    category: 'dashboard',
    stripe: false,
    clientType: 'Ops teams processing invoices, applications, or compliance docs by hand',
    problem:
      'A team was re-typing hundreds of PDFs a month into their system. They needed extraction that survives real-world documents — scans, weird layouts, missing fields — with a human-review step for low-confidence rows.',
    scope: [
      'LLM extraction pipeline with schema-validated JSON output',
      'Per-field confidence scores and a review queue for low-confidence docs',
      'Batch upload with progress and webhooks',
      'Export to CSV / API / direct integration',
      'Audit log of every extraction and correction',
    ],
    stack: ['Next.js', 'TypeScript', 'Claude', 'OpenAI', 'Postgres', 'Prisma', 'Tailwind'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'Cut document handling from minutes each to seconds, with humans only touching the edge cases.',
    tags: ['document AI', 'OCR', 'LLM integration', 'automation', 'data extraction', 'JSON', 'pipeline'],
    demoStatus: 'live',
    demoUrl: '/demos/ai-document-extractor',
    featured: false,
  },

  // ── MVPs — idea to paying product ─────────────────────────────────────────
  {
    slug: 'micro-saas-mvp',
    title: 'AI SaaS MVP in a Week',
    tagline:
      'Landing page, Stripe billing, and a working AI feature — a real product you can charge for.',
    niche: 'MVP / prototype (top niche) + LLM API + Stripe',
    category: 'mvp',
    stripe: true,
    clientType: 'Founders validating an AI product idea who need a payable product, not a mockup',
    problem:
      'The client had a clear idea — turn long-form video transcripts into SEO blog posts — and a deadline. They needed the full path from visitor to paying customer working end to end.',
    scope: [
      'Marketing landing page with live product demo above the fold',
      'The core AI feature: transcript → structured, SEO-ready article',
      'Stripe subscriptions with a billing portal',
      'Email/OAuth authentication and user accounts',
      'Transactional emails and basic usage analytics',
    ],
    stack: ['Next.js', 'TypeScript', 'OpenAI', 'Prisma', 'Postgres', 'Stripe', 'Tailwind'],
    timeToBuild: 'Shipped in 7 days',
    duration: '7 days',
    outcome:
      'Went from idea to a live product taking real payments in a single week.',
    tags: ['MVP', 'AI SaaS', 'Stripe', 'LLM integration', 'landing page', 'subscriptions', 'Next.js'],
    demoStatus: 'live',
    demoUrl: '/demos/micro-saas-mvp',
    featured: true,
  },
  {
    slug: 'assessment-paywall-mvp',
    title: 'Assessment Funnel with Stripe Paywall',
    tagline:
      'A quiz that hooks visitors, teases their results, and converts with a one-click Stripe unlock.',
    niche: 'MVP + Stripe (assessment / quiz funnel)',
    category: 'mvp',
    stripe: true,
    clientType: 'Coaches and content businesses monetizing expertise through assessments',
    problem:
      'The client sold personalized insights but had no product — just calls. They wanted a self-serve funnel: an engaging assessment, a compelling free teaser, and a paid full report, all automated.',
    scope: [
      'Multi-step assessment with progress and instant scoring',
      'Free teaser results with locked premium sections',
      'One-click Stripe checkout to unlock the full report',
      'Shareable results and email capture',
      'Admin view of responses and conversion funnel',
    ],
    stack: ['Next.js', 'TypeScript', 'Stripe', 'Prisma', 'Postgres', 'Tailwind', 'Resend'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'Turned a services business into a product: assessments complete themselves and convert while the client sleeps.',
    tags: ['MVP', 'Stripe', 'paywall', 'quiz funnel', 'assessment', 'conversion', 'Next.js'],
    demoStatus: 'live',
    demoUrl: '/demos/assessment-paywall-mvp',
    featured: false,
  },
  {
    slug: 'membership-portal-mvp',
    title: 'Members-Only Portal with Subscriptions',
    tagline:
      'Gated content, subscription billing, and a clean member experience — the full creator-business stack.',
    niche: 'MVP + Stripe subscriptions (membership / portal)',
    category: 'mvp',
    stripe: true,
    clientType: 'Creators and communities moving off platforms that take 30%',
    problem:
      'The client’s course lived on a marketplace that owned the audience and the margin. They wanted their own portal: locked lessons, Stripe subscriptions, and full control of members and pricing.',
    scope: [
      'Members area with free previews and locked premium content',
      'Stripe subscription checkout and self-serve billing portal',
      'Access control synced to subscription status via webhooks',
      'Progress tracking across lessons',
      'Owner dashboard: members, MRR, churn',
    ],
    stack: ['Next.js', 'TypeScript', 'Stripe', 'Prisma', 'Postgres', 'Tailwind', 'shadcn/ui'],
    timeToBuild: 'Shipped in 6 days',
    duration: '6 days',
    outcome:
      'The client keeps the margin and the audience — subscriptions run themselves through Stripe.',
    tags: ['MVP', 'Stripe', 'subscriptions', 'membership', 'gated content', 'portal', 'Next.js'],
    demoStatus: 'live',
    demoUrl: '/demos/membership-portal-mvp',
    featured: false,
  },
]

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getProjectsByCategory(category: Category): Project[] {
  return projects.filter((p) => p.category === category)
}

// The 2 sibling builds in the same category — powers "More builds like this"
// (clients always ask for 2-3 examples of the same thing).
export function getRelatedProjects(slug: string, limit = 2): Project[] {
  const current = getProject(slug)
  if (!current) return []
  return projects
    .filter((p) => p.slug !== slug && p.category === current.category)
    .sort((a, b) => (a.demoStatus === 'live' ? -1 : 1) - (b.demoStatus === 'live' ? -1 : 1))
    .slice(0, limit)
}

export const featuredProjects = projects.filter((p) => p.featured)
