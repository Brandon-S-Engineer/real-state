// Tipos y constantes compartidos entre servidor y cliente (sin prisma).

export const MARKET_CATEGORIES = ['IPHONE', 'IPAD', 'MACBOOK', 'AUDIO'] as const
export type MarketCategory = (typeof MARKET_CATEGORIES)[number]

export const CATEGORY_LABEL: Record<MarketCategory, string> = {
  IPHONE: 'iPhone',
  IPAD: 'iPad',
  MACBOOK: 'MacBook',
  AUDIO: 'AirPods & audio',
}

export type ModelBand = {
  key: string
  label: string
  n: number
  p25: number
  p50: number
  p75: number
  gone: number
  medianDays: number | null
  active: number
}

export type Opportunity = {
  id: string
  title: string
  price: number
  model: string
  category: MarketCategory
  zone: string | null
  score: number
  marketP50: number | null // mediana de su modelo, para comparar
  url: string
  seenAt: string
}

export type MarketSnapshot = {
  generatedAt: string
  lastCapture: string | null
  firstCapture: string | null
  totals: { tracked: number; gone: number; active: number; new7d: number; priceChanges: number }
  bands: Record<MarketCategory, ModelBand[]>
  opportunities: Opportunity[]
}

export type AgentId = 'parse' | 'spec' | 'comps' | 'market' | 'risk' | 'lead'

export type DeskEvent =
  | { type: 'step'; id: AgentId; status: 'start' }
  | { type: 'step'; id: AgentId; status: 'skipped'; note: string }
  | { type: 'step'; id: AgentId; status: 'done'; ms: number; tokens?: number; output: Record<string, unknown> }
  | { type: 'final'; result: DeskResult; ms: number; tokens: number; cost: number | null }

export type DeskResult = {
  verdict: 'BUY' | 'NEGOTIATE' | 'PASS'
  title: string
  model: string
  price: number
  maxBuy: number
  expectedSale: number
  margin: number
  daysToSell: number | null
  reasoning: string[]
  offerMessage: string
  guardrail: string | null
}
