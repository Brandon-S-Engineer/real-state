// Cliente mínimo de OpenAI vía fetch (sin SDK) para el demo del agente.

export const EMBED_MODEL = 'text-embedding-3-small'

// Solo modelos baratos: el demo es público. USD por millón de tokens, para
// mostrar el costo real de cada respuesta.
export const MODELS = {
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
} as const
export type ModelId = keyof typeof MODELS
export const DEFAULT_MODEL: ModelId = 'gpt-4.1-mini'
const PRICING: Record<string, { input: number; output: number }> = MODELS

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

// Llamada con streaming (SSE). El texto se entrega token por token vía onDelta;
// los tool calls llegan fragmentados y se reensamblan por índice.
export async function chatStream(
  model: ModelId,
  messages: ChatMessage[],
  tools: unknown[],
  onDelta: (text: string) => void,
): Promise<ChatResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
    body: JSON.stringify({
      model,
      messages,
      tools,
      // Los gpt-5 son de razonamiento: no aceptan temperature; con esfuerzo
      // mínimo responden rápido, que es lo que importa en un chat.
      ...(model.startsWith('gpt-5') ? { reasoning_effort: 'minimal' } : { temperature: 0.1 }),
      stream: true,
      stream_options: { include_usage: true },
    }),
  })
  if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status} ${await res.text()}`)

  let content = ''
  const calls: ToolCall[] = []
  let usage: ChatResult['usage'] = { prompt_tokens: 0, completion_tokens: 0 }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.startsWith('data: ') ? line.slice(6).trim() : ''
      if (!data || data === '[DONE]') continue
      const chunk = JSON.parse(data) as {
        choices: {
          delta: {
            content?: string | null
            tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[]
          }
        }[]
        usage?: ChatResult['usage'] | null
      }
      if (chunk.usage) usage = chunk.usage
      const delta = chunk.choices[0]?.delta
      if (!delta) continue
      if (delta.content) {
        content += delta.content
        onDelta(delta.content)
      }
      for (const tc of delta.tool_calls ?? []) {
        const c = (calls[tc.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } })
        if (tc.id) c.id = tc.id
        if (tc.function?.name) c.function.name += tc.function.name
        if (tc.function?.arguments) c.function.arguments += tc.function.arguments
      }
    }
  }
  return { message: { content: content || null, tool_calls: calls.length ? calls : undefined }, usage }
}

// Llamada sin streaming que devuelve un objeto JSON. Con `schema` usa
// Structured Outputs estricto (OpenAI garantiza enums y campos); igual se
// valida con zod del lado del que llama.
export async function chatJson(
  model: ModelId,
  system: string,
  user: string,
  schema?: { name: string; schema: Record<string, unknown> },
): Promise<{ data: unknown; usage: ChatResult['usage'] }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key()}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: schema
        ? { type: 'json_schema', json_schema: { name: schema.name, strict: true, schema: schema.schema } }
        : { type: 'json_object' },
      ...(model.startsWith('gpt-5') ? { reasoning_effort: 'minimal' } : { temperature: 0.1 }),
    }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { choices: { message: { content: string } }[]; usage: ChatResult['usage'] }
  return { data: JSON.parse(json.choices[0].message.content), usage: json.usage }
}
