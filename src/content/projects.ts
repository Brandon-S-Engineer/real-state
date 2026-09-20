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
    slug: 'hybrid-inventory-agent',
    title: 'Hybrid Inventory Agent',
    tagline:
      'One agent, two tools — semantic search for the fuzzy questions, live SQL for the exact ones, and it picks the right one every time.',
    niche: 'AI agent + tools (RAG + structured search)',
    category: 'chatbot',
    stripe: false,
    clientType: 'A multi-brand car dealership with both descriptive content and a live structured inventory',
    problem:
      'Customers ask both fuzzy questions ("something good for a family") and exact ones ("how many do you have under $30k") — a plain FAQ bot has no live data, and a pure-RAG bot guesses at numbers instead of counting rows.',
    scope: [
      'A single agent with two tools it chooses between per question, not a router that just picks a canned reply',
      'Semantic search (RAG) over model descriptions and trim comparisons for descriptive, meaning-based questions',
      'A live SQL tool over the real inventory table for exact, filterable, countable questions',
      'Every answer is grounded and cited — retrieved passages for RAG, actual query rows for SQL, never a guessed number',
      'Full tool-call trace visible per answer: which tool fired, why, and exactly what it returned',
    ],
    stack: ['Next.js', 'FastAPI', 'Pydantic AI', 'pgvector', 'Postgres', 'OpenAI'],
    timeToBuild: 'Shipped in 5 days',
    duration: '5 days',
    outcome:
      'One assistant that handles both the fuzzy and the exact — real data, cited sources, no hallucinated stock.',
    tags: ['AI agent', 'RAG', 'SQL', 'tool use', 'hybrid search', 'pgvector', 'FastAPI', 'inventory'],
    demoStatus: 'live',
    demoUrl: '/demos/hybrid-inventory-agent',
    featured: false,
    tierLevel: 3,
    tierLabel: 'Single agent with tools (RAG + SQL)',
  },
  {
    slug: 'deep-research-agent',
    title: 'Deep Research Agent',
    tagline:
      'Ask a research question, get a cited report in minutes — a team of specialized AI researchers working in parallel, not one bot searching alone.',
    niche: 'Multi-agent orchestration (parallel)',
    category: 'chatbot',
    stripe: false,
    clientType: 'A business that needs a researched report — competitor pricing, market demand, acquisition risk — before every real decision',
    problem:
      'A good report meant one person searching a dozen sources, cross-referencing claims, and writing it up by hand — an hour or more per question, and it didn’t scale past whatever one person could get to that week.',
    scope: [
      'An orchestrator that reads the request and splits it into focused research sub-tasks',
      'Several specialized worker agents dispatched at once, each digging into its own angle — running concurrently, not one after another',
      'A synthesizer that merges every worker’s findings into a single structured report, each claim cited back to the worker that found it',
      'The concurrency is the point: 3 workers running in parallel finish in the time of the slowest one, not the sum of all three',
      'Full trace of the whole run — what was dispatched, what each worker found, and when — so the report is auditable, not a black box',
    ],
    stack: ['Next.js', 'FastAPI', 'Pydantic AI', 'asyncio', 'OpenAI'],
    timeToBuild: 'Shipped in 6 days',
    duration: '6 days',
    outcome:
      'A researched, cited report in minutes instead of hours — and it scales to any topic on demand.',
    tags: ['AI agent', 'multi-agent', 'orchestration', 'parallel', 'research', 'asyncio', 'FastAPI'],
    demoStatus: 'live',
    demoUrl: '/demos/deep-research-agent',
    featured: false,
    tierLevel: 4,
    tierLabel: 'Multi-agent system (parallel orchestration)',
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
    slug: 'one-time-checkout-unlock',
    title: 'One-Time Purchase Unlock',
    tagline:
      'Pay once, get instant access — with a webhook handler that can never double-charge or double-grant.',
    niche: 'Commerce · one-time payment (no recurring billing)',
    category: 'mvp',
    stripe: true,
    clientType: 'Solo creators and small tool-builders selling a single deliverable, not a subscription',
    problem:
      'The client had one good product — a paid report — and just needed people to pay once and get instant access. The catch: Stripe can redeliver the same webhook event, and a naive handler will happily grant access (and send the receipt) twice.',
    scope: [
      'Stripe Checkout (hosted) for the one-time payment — no custom card form to maintain',
      'Webhook handler that verifies the signature before trusting the payload',
      'Idempotent event handling — dedupes by event ID, so a redelivered webhook can never double-grant access or double-send a receipt',
      'Instant access delivery tied to the payment, no account system required',
      'Same pattern extends to any pay-once deliverable: a report, a license key, a download',
    ],
    stack: ['Next.js', 'Stripe Checkout', 'Stripe Webhooks', 'Postgres'],
    timeToBuild: 'Shipped in 2 days',
    duration: '2 days',
    outcome:
      'Customers pay and get access in under 10 seconds — and a retried webhook can never charge or unlock twice.',
    tags: ['MVP', 'Stripe', 'one-time payment', 'webhooks', 'idempotency', 'checkout'],
    demoStatus: 'live',
    demoUrl: '/demos/one-time-checkout-unlock',
    featured: false,
    tierLevel: 1,
    tierLabel: 'One-time payment (no recurring billing)',
  },
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
