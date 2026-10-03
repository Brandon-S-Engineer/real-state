/**
 * Siembra los primeros demos de la biblioteca (ninguno construido todavía).
 *
 * Idempotente y no destructivo: crea los que falten por slug y NUNCA
 * sobreescribe uno existente (lo que edites desde el CRM manda).
 * Todos entran como PLANNED — no aparecen en el portafolio hasta que tengan
 * video real y se publiquen desde /dashboard/demos.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.json scripts/seed-demos.ts [--sync]
 */
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const REPO = 'https://github.com/Brandon-S-Engineer/upwork-demos'

// Orden y alcance según 252 jobs reales (2026-10-03): voz es la demanda #1 y
// el cliente pide grabaciones explícitamente; soporte por email/helpdesk paga
// más; WhatsApp se pide para calificar leads más que para soporte puro.
const DEMOS: Prisma.DemoCreateInput[] = [
  {
    slug: 'ai-voice-receptionist',
    title: 'AI Voice Receptionist',
    buildOrder: 1,
    niche: 'Voice',
    tiers: [3],
    edges: ['VOICE', 'WHATSAPP'],
    summary: 'Answers every call — even after hours — handles FAQs, books the appointment in the calendar, confirms by text, and passes urgent calls to a person.',
    problem:
      'Clinics and service businesses miss a big share of calls when the front desk is busy or closed. Every missed call is a lost booking, and staff spend the day answering the same questions about hours, prices and availability.',
    stack: ['Vapi', 'Twilio', 'Google Calendar', 'n8n', 'OpenAI'],
    flow: [
      { kind: 'edge', label: 'Customer calls', detail: 'Twilio number → Vapi' },
      { kind: 'brain', label: 'Understand the request', detail: 'FAQ, booking, change or urgent' },
      { kind: 'brain', label: 'Answer FAQs', detail: 'from the business knowledge base' },
      { kind: 'action', label: 'Book, move or cancel', detail: 'live Google Calendar slots' },
      { kind: 'edge', label: 'Confirm by text', detail: 'SMS / WhatsApp + reminder' },
      { kind: 'human', label: 'Transfer when urgent', detail: 'warm transfer + call summary logged' },
    ],
    repoPath: 'demos/02-voice-receptionist',
    repoUrl: `${REPO}/tree/main/demos/02-voice-receptionist`,
    matchKeywords: ['voice agent', 'voice ai', 'ai voice', 'receptionist', 'vapi', 'retell', 'bland.ai', 'phone agent', 'inbound calls', 'answer calls', 'voice assistant', 'call center', 'missed calls'],
    excludeKeywords: ['voice over', 'voiceover', 'voice actor', 'voice talent'],
    notes: 'Demanda #1: ~59/252 jobs mencionan voz (23%), 26 con agendado y 21 piden demo/grabación/número en vivo. Ej. casi idéntico: physio 3 clínicas (job 233, $500). Negocio ejemplo: clínica. Reutiliza el brain para FAQs.',
  },
  {
    slug: 'ai-email-support-agent',
    title: 'AI Customer Support Agent',
    buildOrder: 2,
    niche: 'Automation + RAG',
    tiers: [2, 3],
    edges: ['EMAIL'],
    summary: 'Reads every support email or ticket, looks up the order, drafts a grounded reply, sends the safe ones and queues the rest for a person to approve.',
    problem:
      'Support inboxes fill up with the same questions — where is my order, how do I return this. Someone answers each one by hand, slowly and inconsistently, while refunds and real problems wait in the same line.',
    stack: ['n8n', 'Gmail API', 'Shopify Admin API', 'Pinecone', 'OpenAI'],
    flow: [
      { kind: 'edge', label: 'Email or ticket arrives', detail: 'Gmail / helpdesk trigger' },
      { kind: 'brain', label: 'Classify', detail: 'intent, urgency, risk' },
      { kind: 'action', label: 'Look up the order', detail: 'Shopify, read-only' },
      { kind: 'brain', label: 'Draft from policies', detail: 'retrieved docs, cited' },
      { kind: 'action', label: 'Send low-risk replies', detail: 'order status, how-to, policy' },
      { kind: 'human', label: 'Approve the rest', detail: 'refunds, warranty, low confidence' },
    ],
    repoPath: 'demos/01-email-support',
    repoUrl: `${REPO}/tree/main/demos/01-email-support`,
    matchKeywords: ['email support', 'support email', 'support inbox', 'customer support', 'gmail', 'helpdesk', 'zendesk', 'freshdesk', 'email agent', 'email automation', 'inbox'],
    excludeKeywords: ['cold email', 'email marketing', 'newsletter', 'lead generation', 'mailchimp'],
    notes: 'Los presupuestos más altos del set: LiveAgent+Shopify $600-1000 (job 4, pide video de n8n), Gmail→Pinecone→reply $380 (job 37, casi idéntico), soporte $2000 (job 15). Construye aquí el "support brain" que reutilizan voz y WhatsApp.',
  },
  {
    slug: 'whatsapp-support-agent',
    title: 'WhatsApp Lead & Support Agent',
    buildOrder: 3,
    niche: 'Chatbots',
    tiers: [2, 3],
    edges: ['WHATSAPP'],
    summary: 'Replies on WhatsApp in seconds, answers from your knowledge, qualifies the lead, books the next step and hands hot leads to sales with the full context in the CRM.',
    problem:
      'Leads and customers write on WhatsApp and expect an answer in minutes, at any hour. A person can’t keep up, scripted bots can’t answer anything off-script, and good leads go cold before sales sees them.',
    stack: ['WhatsApp Cloud API', 'n8n', 'Pinecone', 'OpenAI', 'HubSpot'],
    flow: [
      { kind: 'edge', label: 'WhatsApp message', detail: 'Meta Cloud API webhook' },
      { kind: 'brain', label: 'Answer or qualify', detail: 'shared support brain' },
      { kind: 'brain', label: 'Ask one question at a time', detail: 'budget, timing, need' },
      { kind: 'action', label: 'Update the CRM', detail: 'contact, stage, summary' },
      { kind: 'human', label: 'Hand off hot leads', detail: 'to sales, with the conversation' },
    ],
    repoPath: 'demos/03-whatsapp-support',
    repoUrl: `${REPO}/tree/main/demos/03-whatsapp-support`,
    matchKeywords: ['whatsapp'],
    excludeKeywords: ['whatsapp marketing', 'bulk message', 'bulk whatsapp'],
    notes: '16/252 jobs (6%), la mayoría piden calificar leads + CRM, no soporte puro (jobs 101, 127/145, 212, 30). Job 45 pide "demo/link a un proyecto WhatsApp+OpenAI que hayas hecho". Prueba el edge-swap: mismo brain, otro canal.',
  },
  {
    slug: 'rag-chatbot-admin-panel',
    title: 'Knowledge Chatbot with Admin Panel',
    buildOrder: 4,
    niche: 'Chatbots',
    tiers: [3, 4],
    edges: ['WEB_CHAT'],
    summary: 'A coded website chatbot that answers only from your documents, cites its sources, captures leads — with an admin panel where your team keeps its knowledge up to date.',
    problem:
      'Company knowledge lives in PDFs and docs nobody can search. Off-the-shelf widgets guess when they don’t know, can’t be customized, and the team has no way to update what the bot knows.',
    stack: ['Next.js', 'FastAPI', 'pgvector', 'OpenAI'],
    flow: [
      { kind: 'action', label: 'Admin uploads docs', detail: 'admin panel' },
      { kind: 'brain', label: 'Chunk + embed', detail: 'ingestion pipeline' },
      { kind: 'edge', label: 'Visitor asks', detail: 'website chat widget' },
      { kind: 'brain', label: 'Retrieve + answer', detail: 'with citations, refuses when unsure' },
      { kind: 'action', label: 'Capture the lead', detail: 'name, need, contact → CRM' },
      { kind: 'human', label: 'Hand off to a person', detail: 'with the conversation' },
    ],
    repoPath: 'demos/04-rag-chatbot-admin',
    repoUrl: `${REPO}/tree/main/demos/04-rag-chatbot-admin`,
    matchKeywords: ['rag', 'knowledge base', 'chatbot', 'chat bot', 'custom gpt', 'chat with documents', 'chat with pdf', 'document q&a', 'ai assistant'],
    excludeKeywords: ['whatsapp', 'voice'],
    notes: 'Piden: admin para actualizar conocimiento (jobs 3, 60), respuestas solo del contenido aprobado + logs (92), citas (142), multilenguaje (3, 60, 224). pgvector alinea con hybrid-inventory-agent.',
  },
]

// --sync: actualiza el contenido (título, orden, copy, flujo, stack, notas) de
// los demos que sigan PLANNED. Nunca toca status, video, repo, keywords ni
// demanda — eso se maneja desde el CRM.
const SYNC = process.argv.includes('--sync')

async function main() {
  for (const d of DEMOS) {
    const exists = await prisma.demo.findUnique({ where: { slug: d.slug }, select: { id: true, status: true } })
    if (exists) {
      if (SYNC && exists.status === 'PLANNED') {
        const { title, buildOrder, niche, tiers, edges, summary, problem, stack, flow, notes } = d
        await prisma.demo.update({ where: { id: exists.id }, data: { title, buildOrder, niche, tiers, edges, summary, problem, stack, flow, notes } })
        console.log(`~ ${d.slug} (contenido sincronizado)`)
      } else {
        console.log(`= ${d.slug} (ya existe, no se toca)`)
      }
      continue
    }
    await prisma.demo.create({ data: { ...d, status: 'PLANNED' } })
    console.log(`+ ${d.slug}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
