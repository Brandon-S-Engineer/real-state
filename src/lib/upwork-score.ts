import { prisma } from '@/lib/db'

// ── Scoring ─────────────────────────────────────────────────────────────────
// Score = "¿cuánto vale mi atención AHORA?" para la estrategia de Bran:
// construir una demo semi-terminada con IA en minutos/horas, mandar gif,
// ganar el proyecto bien definido.
//
// Dos etapas (calibrado contra 234 jobs reales capturados, no en abstracto):
//   1. DESCALIFICADORES → 0/10 directo. Si el cliente renta una persona
//      (empleo, retainer, largo plazo como núcleo, co-founder, rol lead) no
//      hay entregable que demostrar con un gif — no vale NADA de atención,
//      sin importar cuánto nicho/stack tenga el texto. Antes estos jobs
//      llegaban a 9-10 porque el nicho (+3.5) y el stack (+2) tapaban el -4.
//   2. Puntuación para lo calificado: entregable definido + demoable +
//      stack + ganable YA (pocas propuestas, cliente que gasta).
//   3. Penalización por COMPLEJIDAD/TAMAÑO: una spec gigantesca (mucho texto,
//      o lenguaje de proceso corporativo pesado tipo NDA/compliance/CI-CD)
//      significa semanas de trabajo real, no un gif en minutos — sin esto,
//      esas specs enormes ganaban por pura superficie de texto para matchear
//      keywords de nicho/stack, llegando a 10/10 pese a ser lo opuesto de
//      "rápido de ganar" (caso real calibrado: un job de 1572 palabras con
//      15 secciones de scope — webhooks, OAuth, roster matching, exports —
//      marcaba 10/10 solo por keyword match).

export type RawUpworkJob = {
  uid: string
  title: string
  url: string
  description?: string | null
  skills?: string | null
  skillList?: string[] | null
  budget?: string | null
  proposals?: number | null
  proposalText?: string | null
  clientSpent?: number | null
  spentText?: string | null
  postedText?: string | null
  postedHours?: number | null
}

export type ScoreReason = { pts: number; why: string }
export type ScoreResult = { score: number; reasons: ScoreReason[] }

// Señales de que rentan tu tiempo/persona, no compran un entregable.
// Cualquiera de estas → 0 sin apelación.
const DISQUALIFIERS: { re: RegExp; why: string }[] = [
  { re: /part[- ]?time|full[- ]?time/i, why: 'empleo part/full-time' },
  { re: /\bretainer\b|per month|\/month|monthly (rate|salary|pay|retainer|basis|fee)|salar(y|io)/i, why: 'pago mensual/retainer (rentan tu tiempo)' },
  { re: /join (our|the|us)\b|be part of (our|the) team|work (alongside|closely with) (our|the|us)/i, why: 'unirse al equipo' },
  { re: /work times? must overlap|overlap with .{0,30}(time ?zone|hours)|\b\d+ ?(hours|hrs)\/? ?(per )?week/i, why: 'horario/dedicación fija' },
  { re: /co[- ]?founder|\bcto\b|equity|revenue share|technical (partner|cofounder)/i, why: 'co-founder/equity' },
  { re: /\barchitect\b(?! (a|an|the|and))|tech lead|team lead|lead (the|our) (team|developers)|\bmentor(ing)? (the |our |junior |dev|team|engineer)|principal engineer|staff engineer|\binterviewer\b/i, why: 'rol senior/lead/mentor (no entregable)' },
  { re: /\b\d\+? ?years? (of )?experience\b[\s\S]*\b\d\+? ?years? (of )?experience\b/i, why: 'checklist de CV (años de experiencia)' },
]

// Consultoría/asesoría pura: no hay nada que construir ni demostrar con gif.
const CONSULTATION = /\b(paid )?(consultation|strategy (call|session)|advisory (call|session)|coaching (call|session))\b/i

// Largo plazo como NÚCLEO del trabajo descalifica. Pero "potential for
// long-term collaboration as the product scales" (hedgeado, secundario a un
// build concreto) solo penaliza suave — varios MVPs prime lo mencionan.
const LONG_TERM_CORE = /long[- ]?term (position|role|relationship|collaboration|partnership|contract|subcontractor|contractor|engagement|hire|commitment|basis|work)/i
const LONG_TERM_HEDGE = /(potential|possible|possibility|could|open to|opportunity|may lead|future|if (this|things|it) (goes|go|works)|as the (product|platform|company|business) (scales|grows)|leading to|with (the )?(potential|possibility))/i

const NOCODE_TITLE = /\bbubble(\.io)?\b|\bwebflow\b|\bzapier\b|\bmake\.com\b|gohighlevel|\bghl\b|\bairtable\b|\bglide\b|\bsoftr\b|\bretool\b|low[- ]?code|no[- ]?code|\bwordpress\b|\bwix\b|\bsquarespace\b/i

// "Looking for/hiring a developer" es forma de rol — pero si hay entregable
// concreto (build/fix/finish algo) sobrevive: mandar la demo gana igual.
const ROLE_SHAPED = /\b(looking|searching) for\b.{0,50}\b(developer|engineer|programmer|coder|freelancer|specialist)|\bhiring\b.{0,40}(developer|engineer|programmer|coder|designer)/i

const DELIVERABLE_VERBS = /\b(build|create|integrate|fix|set ?up|migrate|clone|redesign|add|implement|connect|automate|convert|launch|configure|deploy|refactor|develop|finish|complete|improve|upgrade)\b/i

const NICHE: { re: RegExp; label: string; pts: number }[] = [
  { re: /\bmvp\b|\bprototype\b|proof of concept|\bpoc\b/i, label: 'mvp/prototipo', pts: 1.5 },
  { re: /\bsaas\b/i, label: 'saas', pts: 0.75 },
  { re: /chatbot|chat bot|ai assistant|ai agent/i, label: 'chatbot/agente', pts: 1 },
  { re: /openai|gpt-?\d|\bgpt\b|\bllm\b|\brag\b|claude|anthropic|gemini/i, label: 'llm-api', pts: 0.75 },
  { re: /\bintegrat/i, label: 'integración', pts: 0.5 },
  { re: /automation|automate|workflow/i, label: 'automatización', pts: 0.5 },
]

const CORE_STACK = /\bnext\.?js\b|\breact\b(?!\s*native)|\bnode\.?js\b|\bexpress\b|\bmongo|\bmern\b|\bremix\b|\bvite\b|\bnest\.?js\b|typescript|tailwind|supabase|prisma|postgres/i

// Stacks claramente fuera del tuyo (web JS/TS) — mobile nativo y backends en
// otro lenguaje. Antes "react native" matcheaba el CORE_STACK vía \breact\b y
// sumaba +1.5 como si fuera tu stack; ahora se excluye ahí y se penaliza aquí.
const OFF_STACK: { re: RegExp; label: string }[] = [
  { re: /react native/i, label: 'react native' },
  { re: /\bflutter\b/i, label: 'flutter' },
  { re: /\bswift(?:ui)?\b|objective-?c/i, label: 'ios nativo (swift/objc)' },
  { re: /\bkotlin\b/i, label: 'android nativo (kotlin)' },
  { re: /\bxamarin\b/i, label: 'xamarin' },
  { re: /ruby on rails/i, label: 'ruby on rails' },
  { re: /\blaravel\b/i, label: 'laravel' },
  { re: /\bphp\b/i, label: 'php' },
  { re: /\bdjango\b|\bflask\b/i, label: 'python web (django/flask)' },
  { re: /asp\.net|\bc#\b|\.net\b/i, label: '.net/c#' },
  { re: /spring ?boot/i, label: 'java spring' },
  { re: /\bunity3d\b|\bunreal engine\b/i, label: 'motor de videojuegos' },
]

const VISUAL: RegExp[] = [
  /\bui\b|\bux\b|ui\/ux/i, /front[- ]?end/i, /landing page/i, /\bdashboard\b/i,
  /web ?app|web application/i, /\bwebsite\b/i, /redesign/i, /figma|mockup|wireframe/i,
  /chat widget|\bwidget\b/i, /admin panel/i, /e-?commerce|storefront|shopify/i,
  /\bcharts?\b|graphs?/i, /onboarding|checkout/i, /\bportal\b/i,
]

// El caso ideal: el cliente ya hizo la tarea — spec/diseño/PRD listos, solo
// espera a alguien que ejecute. Una demo semi-terminada gana esto YA.
const SPEC_READY = /already (defined|specced|scoped|documented)|fully (specced|scoped|defined|documented)|(spec|prd|brief|figma|design|mockup|wireframe)s? (is |are )?(ready|complete|provided|available|attached|included)|detailed (spec|brief|requirements|documentation)|(have|has) been defined/i

// Un trial pequeño y pagado como puerta de entrada ("$100 fixed-price
// scoped task, 24-48h") es justo lo que la estrategia de Bran quiere —
// aunque la descripción completa (incluyendo el contexto del contrato
// grande detrás) sea larga, compensa la penalización de tamaño.
const MICRO_TRIAL = /micro[- ]?trial|paid (test|trial) task|test task.{0,40}\$\d|trial (task|project).{0,40}fixed[- ]?price|small (paid )?(test|trial)/i

// Vocabulario de proceso corporativo pesado (NDA, compliance, auditoría,
// CI/CD con staging/rollback) — cuando aparecen varios juntos, es una señal
// mucho más precisa que el conteo de palabras de "esto es un engagement
// enterprise de semanas/meses", incluso en descripciones que no son larguísimas.
const ENTERPRISE_PROCESS = /\bNDA\b|non-disclosure|implementation documents?\b|acceptance criteria|owner review|audit trail|rollback plan|regression test|staging environment|\bcompliance\b|\bCI\/CD\b/gi

// Sin penalización hasta 500 palabras (la inmensa mayoría de jobs
// bien-ganables viven ahí); después escala hasta -8 — una spec de pocas
// líneas puede tener nicho perfecto, pero una de miles de palabras es
// semanas de trabajo sin importar qué tan bien encaje el nicho.
function lengthPenalty(wordCount: number): number {
  if (wordCount <= 500) return 0
  return -Math.min(8, (wordCount - 500) / 180)
}

function parseBudgetAmount(budget?: string | null): number {
  if (!budget) return 0
  const m = budget.replace(/,/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

export function scoreUpworkJob(job: RawUpworkJob): ScoreResult {
  const title = (job.title || '').toLowerCase()
  const desc = job.description || ''
  const text = [job.title, desc, job.skills || ''].join(' ')

  // ── Etapa 1: descalificadores ──────────────────────────────────────────
  const dq = (why: string): ScoreResult => ({ score: 0, reasons: [{ pts: -10, why: `DESCALIFICADO: ${why}` }] })

  for (const { re, why } of DISQUALIFIERS) {
    if (re.test(text)) return dq(why)
  }
  if (NOCODE_TITLE.test(title)) return dq('plataforma no-code (no es tu stack)')
  if (CONSULTATION.test(text)) return dq('consultoría/asesoría (nada que construir)')

  const ltMatch = text.match(LONG_TERM_CORE)
  let longTermHedged = false
  if (ltMatch) {
    const i = text.search(LONG_TERM_CORE)
    const ctx = text.slice(Math.max(0, i - 80), i + ltMatch[0].length + 80)
    if (LONG_TERM_HEDGE.test(ctx)) longTermHedged = true
    else return dq('relación de largo plazo como núcleo')
  }

  const hasDeliverable = DELIVERABLE_VERBS.test(title) || DELIVERABLE_VERBS.test(desc)
  if (ROLE_SHAPED.test(text) && !hasDeliverable) return dq('busca un rol, sin entregable concreto')

  // ── Etapa 2: puntuación ────────────────────────────────────────────────
  let score = 0
  const reasons: ScoreReason[] = []
  const add = (pts: number, why: string) => {
    score += pts
    reasons.push({ pts: Math.round(pts * 10) / 10, why })
  }

  // Entregable definido
  if (DELIVERABLE_VERBS.test(title)) add(1.5, 'verbo de entregable en título')
  if (/\b[123]\.\s|•|\n-\s|requirements?:|deliverables?:|features?:|scope:/i.test(desc)) add(1, 'requisitos itemizados')

  const hasBudget = !!job.budget && job.budget.includes('$')
  const isHourly = /\/hr|hour/i.test(job.budget || '')
  if (hasBudget && !isHourly) {
    add(1.5, 'presupuesto fijo')
    const amt = parseBudgetAmount(job.budget)
    if (amt >= 200 && amt <= 5000) add(1, `presupuesto sano ($${amt})`)
    else if (amt > 0 && amt < 100) add(-2, `presupuesto muy bajo ($${amt})`)
  }

  let nichePts = 0
  const nicheLabels: string[] = []
  for (const { re, label, pts } of NICHE) {
    if (re.test(text)) { nichePts += pts; nicheLabels.push(label) }
  }
  if (nichePts > 0) add(Math.min(nichePts, 2.5), `nicho: ${nicheLabels.join(', ')}`)

  if (CORE_STACK.test(text)) add(1.5, 'tu stack (JS/TS moderno)')

  const offStackHits = OFF_STACK.filter(({ re }) => re.test(text)).map(({ label }) => label)
  if (offStackHits.length > 0) add(-2.5, `fuera de tu stack: ${offStackHits.join(', ')}`)

  const visualHits = VISUAL.filter((re) => re.test(text)).length
  if (visualHits > 0) add(Math.min(visualHits * 0.75, 2), `mostrable en gif (${visualHits} señales UI)`)

  if (/asap|this week|few days|urgent|quickly|immediately|right away|today/i.test(text)) add(0.5, 'urgencia')

  if (SPEC_READY.test(text)) add(1, 'spec/diseño ya definido — solo ejecutar')

  // Ganable YA — la estrategia depende de llegar con la ventana abierta.
  // Ojo: proposals se refresca en cada re-scan, así que el score decae solo
  // a medida que el job se llena de propuestas. Eso es deliberado.
  const p = job.proposals
  if (p != null) {
    if (p < 5) add(1, 'pocas propuestas (<5) — ventana abierta')
    else if (p < 10) add(0.5, 'propuestas moderadas (5-9)')
    else if (p >= 50) add(-1.5, 'muchísimas propuestas (50+)')
    else if (p >= 20) add(-0.5, 'bastantes propuestas (20-50)')
  }
  if ((job.clientSpent ?? 0) >= 1000) add(0.5, 'cliente con historial de gasto')

  // Penalizaciones suaves (no descalifican, pero restan)
  if (longTermHedged || /long[- ]?term/i.test(text)) add(-1.5, 'menciona largo plazo (secundario)')
  if (/\bongoing\b/i.test(text)) add(-2, 'trabajo continuo')
  if (/help (us|me) with|various tasks|general (help|support)|need someone/i.test(text)) add(-2.5, 'alcance vago')
  if (/i have an idea|building a (startup|company)( from scratch)?/i.test(text)) add(-1.5, 'idea sin definir')

  // ── Complejidad/tamaño: spec gigantesca = semanas, no un gif ──────────────
  const wordCount = desc.split(/\s+/).filter(Boolean).length
  let sizePenalty = lengthPenalty(wordCount)
  if (sizePenalty < 0 && MICRO_TRIAL.test(desc)) sizePenalty += 2
  const enterpriseHits = (desc.match(ENTERPRISE_PROCESS) || []).length
  if (enterpriseHits >= 3) sizePenalty -= 3
  if (sizePenalty < 0) add(sizePenalty, `spec extensa/enterprise (${wordCount}p${enterpriseHits >= 3 ? `, ${enterpriseHits} términos de proceso` : ''})`)

  return { score: Math.round(Math.max(0, Math.min(10, score))), reasons }
}

// ── Recalcular ────────────────────────────────────────────────────────────
// Reaplica scoreUpworkJob() a todo lo que ya está guardado — el reemplazo del
// flujo "recarga la extensión y vuelve a escanear" de CALIBRATION.md.

export async function recalcularUpworkScores(): Promise<{ updated: number }> {
  const jobs = await prisma.upworkJob.findMany({
    select: {
      id: true, uid: true, title: true, url: true, description: true,
      skills: true, budget: true, proposals: true, proposalText: true,
      clientSpent: true, spentText: true, postedText: true, postedHours: true,
    },
  })

  for (const j of jobs) {
    const { score, reasons } = scoreUpworkJob({
      ...j,
      skills: Array.isArray(j.skills) ? (j.skills as string[]).join(' ') : '',
    })
    await prisma.upworkJob.update({
      where: { id: j.id },
      data: { score, reasons },
    })
  }

  return { updated: jobs.length }
}
