// Productized, fixed-price offers. AI is the lead offer and mirrors the
// "AI Chatbots & Agents" complexity ladder 1:1 — every tier maps to its live
// demo in /work, so a buyer can see exactly what each level does before
// paying for it. Timeline and stack are read from the linked project so the
// two pages can never drift apart.

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
  price: string
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
    price: 'from $600',
    work: 'lead-to-crm-automation',
  },
  {
    tier: 2,
    name: 'AI Classification & Routing',
    pickIf: 'people spend hours reading things just to decide what happens next.',
    youGet: [
      'AI reads, classifies, and summarizes every item',
      'Each one routed to the right person or queue instantly',
      'A safe fallback if the AI ever misbehaves',
    ],
    price: 'from $1,000',
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
    price: 'from $2,200',
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
    price: 'from $3,800',
    work: 'deep-research-agent',
  },
]

export function getAiServiceDetails(s: AiService) {
  const p = getProject(s.work)
  return {
    timeline: p?.duration ?? '',
    tierLabel: p?.tierLabel ?? '',
    stack: p?.stack ?? [],
  }
}

// Secondary offers — the product around the AI. Kept deliberately compact.
export type OtherService = {
  name: string
  summary: string
  price: string
  // anchor on the /work page
  workAnchor: string
}

export const otherServices: OtherService[] = [
  {
    name: 'Payments & Billing',
    summary:
      'One-time checkout, subscriptions, usage billing, or marketplace payouts — the money side of your product, built on Stripe.',
    price: 'from $1,000',
    workAnchor: 'mvp',
  },
  {
    name: 'Dashboards & Internal Tools',
    summary:
      'Admin panels, CRMs, and ops tools with auth, charts, and tables your team actually uses.',
    price: 'from $1,800',
    workAnchor: 'dashboard',
  },
]
