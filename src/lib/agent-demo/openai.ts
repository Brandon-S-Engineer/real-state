// Cliente mínimo de OpenAI vía fetch (sin SDK) para el demo del agente.

export const CHAT_MODEL = process.env.AGENT_DEMO_MODEL ?? 'gpt-4.1-mini'
export const EMBED_MODEL = 'text-embedding-3-small'

// USD por millón de tokens, para mostrar el costo real de cada respuesta.
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

export function costUsd(model: string, input: number, output: number) {
  const p = PRICING[model]
  if (!p) return null
  return (input * p.input + output * p.output) / 1_000_000
}

function key() {
  const k = process.env.OPENAI_API_KEY
  if (!k) throw new Error('OPENAI_API_KEY is not set')
  return k
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) throw new Error(`Embeddings failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { data: { embedding: number[] }[] }
  return json.data.map((d) => d.embedding)
}

export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

export type ChatResult = {
  message: { content: string | null; tool_calls?: ToolCall[] }
  usage: { prompt_tokens: number; completion_tokens: number }
}

export async function chat(messages: ChatMessage[], tools: unknown[]): Promise<ChatResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
    body: JSON.stringify({ model: CHAT_MODEL, messages, tools, temperature: 0.1 }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { choices: { message: ChatResult['message'] }[]; usage: ChatResult['usage'] }
  return { message: json.choices[0].message, usage: json.usage }
}
