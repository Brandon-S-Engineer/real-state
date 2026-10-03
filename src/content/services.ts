// Productized offers. AI is the lead offer and mirrors the "AI Chatbots &
// Agents" complexity ladder 1:1 — every tier maps to its live demo, so a buyer
// can see exactly what each level does before paying for it.
//
// No prices here on purpose: the site is linked from freelance marketplace
// profiles, and the price lives in the marketplace offer (it differs per
// platform after fees). The site sells the level; the platform closes it.

import { getProject } from './projects'

export type AiService = {
  tier: 1 | 2 | 3 | 4
  // Plain-language capability name — neutral on purpose: it's what adapts to
  // the client's business, while the linked demo is one concrete example.
  name: string
  // The situation that means "this is your tier".
  pickIf: string
  // Outcomes, not features.
  youGet: string[]
  // slug of the matching case study / live demo
  work: string
}

export const aiServices: AiService[] = [
  {
    tier: 1,
    name: 'Workflow Automation',
    pickIf: 'your team copies the same data between tools by hand, every day.',
    youGet: [
      'Leads, orders, or forms flow into your tools automatically',
      'Failed steps retry and alert a human — nothing lost silently',
      'Runs 24/7 with zero manual entry',
    ],
    work: 'lead-to-crm-automation',
  },
  {
    tier: 2,
    // soft hyphen: only breaks in the narrow mobile hero staircase
    name: 'AI Classi\u00ADfication & Routing',
    pickIf: 'people spend hours reading things just to decide what happens next.',
    youGet: [
      'AI reads, classifies, and summarizes every item',
      'Each one routed to the right person or queue instantly',
      'A safe fallback if the AI ever misbehaves',
    ],
    work: 'smart-inbox-router',
  },
  {
    tier: 3,
    name: 'AI Agent on Your Data',
    pickIf: 'the answers already exist in your docs or database, but finding them takes a person.',
    youGet: [
      'Answers from your documents and your live data',
      'Every answer cites its source — no invented numbers',
      'See exactly how each answer was found',
    ],
    work: 'hybrid-inventory-agent',
  },
  {
    tier: 4,
    name: 'Multi-Agent Systems',
    pickIf: 'the job is too big for one AI — it needs several specialists working together.',
    youGet: [
      'Specialized agents working in parallel',
      'Their results merged into one reliable output',
      'Full audit trail of what each agent did',
    ],
    work: 'deep-research-agent',
  },
]

// A service joined with its linked project — everything the ladder cards and
// the live demo stage render. Timeline, tier label, and stack come from the
// project so Services, Home, and Work can never drift apart.
export type LadderItem = AiService & {
  timeline: string
  tierLabel: string
  stack: string[]
  tagline: string
  // title of the concrete example project shown in the demo stage
  exampleTitle: string
  demoUrl: string
}

export function getLadderItems(): LadderItem[] {
  return aiServices.map((s) => {
    const p = getProject(s.work)
    return {
      ...s,
      timeline: p?.duration ?? '',
      tierLabel: p?.tierLabel ?? '',
      stack: p?.stack ?? [],
      tagline: p?.tagline ?? '',
      exampleTitle: p?.title ?? '',
      demoUrl: p?.demoUrl ?? `/demos/${s.work}`,
    }
  })
}

// Secondary offers — the product around the AI. Kept deliberately compact.
export type OtherService = {
  name: string
  summary: string
  // group anchor on the /demos page
  demoAnchor: string
}

export const otherServices: OtherService[] = [
  {
    name: 'Payments & Billing',
    summary:
      'One-time checkout, subscriptions, usage billing, or marketplace payouts — the money side of your product, built on Stripe.',
    demoAnchor: 'payments',
  },
  {
    name: 'Dashboards & Internal Tools',
    summary:
      'Admin panels, CRMs, and ops tools with auth, charts, and tables your team actually uses.',
    demoAnchor: 'dashboards',
  },
]
