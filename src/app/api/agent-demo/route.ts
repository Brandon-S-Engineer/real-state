// Endpoint público del demo "Company Data Agent". Corre un loop de tool calling
// y transmite cada paso como NDJSON para que la UI muestre la traza en vivo:
// qué tool llamó, con qué argumentos, el SQL que ejecutó, las fuentes del RAG,
// tokens, costo y latencia.

import { z } from 'zod'
import { CHAT_MODEL, chat, costUsd, type ChatMessage } from '@/lib/agent-demo/openai'
import { runTool, toolSpecs, type Source } from '@/lib/agent-demo/tools'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `You are the customer support agent for Volt Mobile, a Mexican store that sells refurbished iPhones.
Rules:
- Answer ONLY with facts returned by your tools. Never invent prices, stock, dates or policies.
- For policy questions call search_docs and cite every fact with its source id in brackets, e.g. [returns#1].
- For inventory questions call find_products. Prices are in MXN.
- For order questions you need BOTH the order id and the email. If either is missing, ask for it. Never reveal an order that did not match.
- If the tools return nothing relevant, say you don't have that information and offer to connect the customer with a human. Do not guess.
- You are read-only: you cannot cancel, refund or change orders. Say a human agent will handle those requests.
- Reply in the same language as the customer's last message (English unless they wrote in another language). Be brief.`

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(1000) }))
    .min(1)
    .max(12),
})

// Límite por IP en memoria. En serverless es aproximado (por instancia), pero
// basta para que nadie queme los créditos de la API desde el portafolio.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 25
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) return true
  recent.push(now)
  hits.set(ip, recent)
  return false
}

const MAX_STEPS = 5

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (rateLimited(ip)) {
    return Response.json({ error: 'Demo limit reached for this hour. Try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      const started = Date.now()
      const totals = { input: 0, output: 0 }
      const sources: Source[] = []
      const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM }, ...parsed.data.messages]

      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          const t0 = Date.now()
          const { message, usage } = await chat(messages, [...toolSpecs])
          totals.input += usage.prompt_tokens
          totals.output += usage.completion_tokens
          send({ type: 'llm', step, ms: Date.now() - t0, input: usage.prompt_tokens, output: usage.completion_tokens })

          if (!message.tool_calls?.length) {
            send({
              type: 'answer',
              content: message.content ?? '',
              sources,
              model: CHAT_MODEL,
              ms: Date.now() - started,
              tokens: totals,
              cost_usd: costUsd(CHAT_MODEL, totals.input, totals.output),
            })
            controller.close()
            return
          }

          messages.push({ role: 'assistant', content: message.content, tool_calls: message.tool_calls })
          for (const call of message.tool_calls) {
            const t1 = Date.now()
            send({ type: 'tool_call', id: call.id, name: call.function.name, args: call.function.arguments })
            const out = await runTool(call.function.name, call.function.arguments)
            if (out.sources) sources.push(...out.sources.filter((s) => !sources.some((x) => x.id === s.id)))
            send({
              type: 'tool_result',
              id: call.id,
              name: call.function.name,
              ms: Date.now() - t1,
              sql: out.sql,
              sources: out.sources,
              rows: Array.isArray(out.result) ? out.result.length : undefined,
              preview: JSON.stringify(out.result).slice(0, 600),
            })
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(out.result) })
          }
        }
        send({ type: 'error', message: 'The agent took too many steps. Try a more specific question.' })
      } catch (e) {
        console.error('[agent-demo]', e)
        send({ type: 'error', message: 'The agent failed to answer. Please try again.' })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
