/**
 * Siembra los primeros demos de la biblioteca (ninguno construido todavía).
 *
 * Idempotente y no destructivo: crea los que falten por slug y NUNCA
 * sobreescribe uno existente (lo que edites desde el CRM manda).
 * Todos entran como PLANNED — no aparecen en el portafolio hasta que tengan
 * video real y se publiquen desde /dashboard/demos.
 *
 * Uso: npx tsx --tsconfig scripts/tsconfig.json scripts/seed-demos.ts
 */
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const REPO = 'https://github.com/Brandon-S-Engineer/upwork-demos'

const DEMOS: Prisma.DemoCreateInput[] = [
  {
    slug: 'ai-email-support-agent',
    title: 'AI Email Support Agent',
    buildOrder: 1,
    niche: 'Automation + RAG',
    tiers: [2, 3],
    edges: ['EMAIL'],
    summary: 'Reads every support email, answers from your knowledge base, and hands anything uncertain to a human.',
    problem:
      'Support inboxes fill up with the same questions. Someone answers each one by hand — slowly, inconsistently — and the urgent ones wait in line with everything else.',
    stack: ['n8n', 'Gmail API', 'Pinecone', 'OpenAI'],
    flow: [
      { kind: 'edge', label: 'Email arrives', detail: 'Gmail trigger' },
      { kind: 'brain', label: 'Classify', detail: 'intent, urgency, language' },
      { kind: 'brain', label: 'Retrieve', detail: 'knowledge base (RAG)' },
      { kind: 'brain', label: 'Draft reply', detail: 'grounded in retrieved docs' },
      { kind: 'action', label: 'Send or save as draft', detail: 'by confidence' },
      { kind: 'human', label: 'Escalate when unsure', detail: 'with full context' },
    ],
    repoPath: 'demos/01-email-support',
    repoUrl: `${REPO}/tree/main/demos/01-email-support`,
    matchKeywords: ['email support', 'support email', 'support inbox', 'customer support', 'gmail', 'helpdesk', 'zendesk', 'freshdesk', 'email agent', 'email automation', 'inbox'],
    excludeKeywords: ['cold email', 'email marketing', 'newsletter', 'lead generation', 'mailchimp'],
    notes: 'Construye el "support brain" (sub-workflow de n8n agnóstico de canal) que reutilizan los demos 2 y 3.',
  },
  {
    slug: 'ai-voice-receptionist',
    title: 'AI Voice Receptionist',
    buildOrder: 2,
    niche: 'Voice',
    tiers: [3],
    edges: ['VOICE', 'WHATSAPP'],
    summary: 'Answers the clinic phone, handles FAQs, books appointments in the calendar, and confirms on WhatsApp.',
    problem:
      'Clinics miss calls during busy hours and after closing — every missed call is a lost booking, and staff spend the day answering the same questions about hours, prices, and availability.',
    stack: ['Vapi', 'Twilio', 'Google Calendar', 'WhatsApp Cloud API', 'n8n', 'OpenAI'],
    flow: [
      { kind: 'edge', label: 'Patient calls', detail: 'Twilio number → Vapi' },
      { kind: 'brain', label: 'Understand request', detail: 'FAQ or booking' },
      { kind: 'brain', label: 'Answer FAQs', detail: 'shared support brain' },
      { kind: 'action', label: 'Book appointment', detail: 'Google Calendar' },
      { kind: 'edge', label: 'Confirm on WhatsApp', detail: 'Meta Cloud API' },
      { kind: 'human', label: 'Log call / transfer', detail: 'call log + human handoff' },
    ],
    repoPath: 'demos/02-voice-receptionist',
    repoUrl: `${REPO}/tree/main/demos/02-voice-receptionist`,
    matchKeywords: ['voice agent', 'voice ai', 'ai voice', 'receptionist', 'vapi', 'retell', 'bland.ai', 'phone agent', 'inbound calls', 'answer calls', 'voice assistant', 'call center'],
    excludeKeywords: ['voice over', 'voiceover', 'voice actor', 'voice talent'],
    notes: '~1 de cada 5 posts; piden grabaciones del demo explícitamente. Reutiliza el brain del demo 1 para FAQs.',
  },
  {
    slug: 'whatsapp-support-agent',
    title: 'WhatsApp Support Agent',
    buildOrder: 3,
    niche: 'Chatbots',
    tiers: [2, 3],
    edges: ['WHATSAPP'],
    summary: 'The same support brain, answering customers on WhatsApp — only the channel changes.',
    problem:
      'Customers write on WhatsApp and expect answers in minutes, at any hour. A person can’t keep up, and a rules-based bot can’t answer anything it wasn’t scripted for.',
    stack: ['WhatsApp Cloud API', 'n8n', 'Pinecone', 'OpenAI'],
    flow: [
      { kind: 'edge', label: 'WhatsApp message', detail: 'Meta Cloud API webhook' },
      { kind: 'brain', label: 'Classify', detail: 'shared support brain' },
      { kind: 'brain', label: 'Retrieve', detail: 'knowledge base (RAG)' },
      { kind: 'brain', label: 'Reply', detail: 'grounded answer' },
      { kind: 'human', label: 'Escalate when unsure', detail: 'handoff to a person' },
    ],
    repoPath: 'demos/03-whatsapp-support',
    repoUrl: `${REPO}/tree/main/demos/03-whatsapp-support`,
    matchKeywords: ['whatsapp'],
    excludeKeywords: ['whatsapp marketing', 'bulk message', 'bulk whatsapp'],
    notes: 'Prueba el edge-swap: mismo brain que el demo 1, solo cambia el canal.',
  },
  {
    slug: 'rag-chatbot-admin-panel',
    title: 'RAG Chatbot with Admin Panel',
    buildOrder: 4,
    niche: 'Chatbots',
    tiers: [3, 4],
    edges: ['WEB_CHAT'],
    summary: 'A coded chatbot that answers from your company documents — with an admin panel to upload and manage them.',
    problem:
      'Company knowledge lives in PDFs and docs nobody can search. Off-the-shelf chat widgets can’t be customized, and the team has no way to keep the bot’s knowledge up to date themselves.',
    stack: ['Next.js', 'FastAPI', 'OpenAI'],
    flow: [
      { kind: 'action', label: 'Admin uploads docs', detail: 'admin panel' },
      { kind: 'brain', label: 'Chunk + embed', detail: 'ingestion pipeline' },
      { kind: 'edge', label: 'Visitor asks', detail: 'web chat widget' },
      { kind: 'brain', label: 'Retrieve + answer', detail: 'with citations' },
      { kind: 'human', label: 'Hand off to a person', detail: 'when unsure' },
    ],
    repoPath: 'demos/04-rag-chatbot-admin',
    repoUrl: `${REPO}/tree/main/demos/04-rag-chatbot-admin`,
    matchKeywords: ['rag', 'knowledge base', 'chatbot', 'chat bot', 'custom gpt', 'chat with documents', 'chat with pdf', 'document q&a', 'ai assistant'],
    excludeKeywords: ['whatsapp', 'voice'],
    notes: 'La versión que los freelancers no-code no pueden igualar. Vector store por decidir (pgvector encaja con hybrid-inventory-agent).',
  },
]

async function main() {
  for (const d of DEMOS) {
    const exists = await prisma.demo.findUnique({ where: { slug: d.slug }, select: { id: true } })
    if (exists) {
      console.log(`= ${d.slug} (ya existe, no se toca)`)
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
