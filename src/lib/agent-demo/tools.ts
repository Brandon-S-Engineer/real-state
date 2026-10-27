// Tools del agente. Todas son de solo lectura y parametrizadas: el modelo nunca
// escribe SQL, solo elige una tool y sus argumentos (validados con zod).

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { embed } from './openai'

export type Source = { id: string; title: string; heading: string; score: number }

export const toolSpecs = [
  {
    type: 'function',
    function: {
      name: 'search_docs',
      description:
        'Semantic search over the company policy documents (shipping, returns, warranty, device grades, payments, trade-in). Use for any policy question.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What to look for, in English.' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_products',
      description: 'Look up devices in the live inventory. All filters are optional.',
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model name or part of it, e.g. "iPhone 15" or "Pro".' },
          max_price_mxn: { type: 'number' },
          grade: { type: 'string', enum: ['A', 'B', 'C'] },
          in_stock_only: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description:
        'Get the status of one order. Requires BOTH the order id and the email used to buy it; the order is only returned if they match.',
      parameters: {
        type: 'object',
        properties: { order_id: { type: 'string' }, email: { type: 'string' } },
        required: ['order_id', 'email'],
      },
    },
  },
] as const

const searchArgs = z.object({ query: z.string().min(2).max(300) })
const productArgs = z.object({
  model: z.string().max(60).optional(),
  max_price_mxn: z.number().positive().optional(),
  grade: z.enum(['A', 'B', 'C']).optional(),
  in_stock_only: z.boolean().optional(),
})
const orderArgs = z.object({ order_id: z.string().max(20), email: z.string().max(120) })

type ToolOutput = { result: unknown; sources?: Source[]; sql?: string }

export async function runTool(name: string, rawArgs: string): Promise<ToolOutput> {
  let args: unknown
  try {
    args = JSON.parse(rawArgs || '{}')
  } catch {
    return { result: { error: 'Invalid JSON arguments' } }
  }

  if (name === 'search_docs') {
    const a = searchArgs.safeParse(args)
    if (!a.success) return { result: { error: 'Invalid arguments' } }
    const [vec] = await embed([a.data.query])
    const sql = `SELECT id, title, heading, body, 1 - (embedding <=> $1::vector) AS score
FROM agent_demo.doc_chunks ORDER BY embedding <=> $1::vector LIMIT 4`
    const rows = await prisma.$queryRawUnsafe<
      { id: string; title: string; heading: string; body: string; score: number }[]
    >(sql, `[${vec.join(',')}]`)
    // Fragmentos con muy poca similitud no se le pasan al modelo: si no hay
    // nada relevante, que lo diga en vez de inventar.
    const relevant = rows.filter((r) => Number(r.score) >= 0.3)
    return {
      sql,
      sources: relevant.map((r) => ({ id: r.id, title: r.title, heading: r.heading, score: Number(r.score) })),
      result: relevant.length
        ? relevant.map((r) => ({ source_id: r.id, title: r.title, heading: r.heading, text: r.body }))
        : { note: 'No relevant documents found.' },
    }
  }

  if (name === 'find_products') {
    const a = productArgs.safeParse(args)
    if (!a.success) return { result: { error: 'Invalid arguments' } }
    const { model, max_price_mxn, grade, in_stock_only } = a.data
    const where: string[] = []
    const params: unknown[] = []
    if (model) {
      params.push(`%${model}%`)
      where.push(`model ILIKE $${params.length}`)
    }
    if (max_price_mxn) {
      params.push(max_price_mxn)
      where.push(`price_mxn <= $${params.length}`)
    }
    if (grade) {
      params.push(grade)
      where.push(`grade = $${params.length}`)
    }
    if (in_stock_only) where.push('stock > 0')
    const sql = `SELECT sku, model, storage_gb, grade, color, price_mxn, stock, battery_health
FROM agent_demo.products${where.length ? `\nWHERE ${where.join(' AND ')}` : ''}
ORDER BY price_mxn LIMIT 10`
    const rows = await prisma.$queryRawUnsafe(sql, ...params)
    return { sql, result: rows }
  }

  if (name === 'get_order') {
    const a = orderArgs.safeParse(args)
    if (!a.success) return { result: { error: 'Invalid arguments' } }
    const sql = `SELECT o.id, o.status, o.total_mxn, o.created_at, o.shipped_at, o.carrier, o.tracking, p.model, p.storage_gb, p.color
FROM agent_demo.orders o JOIN agent_demo.products p ON p.sku = o.sku
WHERE o.id = $1 AND lower(o.customer_email) = lower($2)`
    const rows = await prisma.$queryRawUnsafe<unknown[]>(sql, a.data.order_id.toUpperCase(), a.data.email.trim())
    return {
      sql,
      result: rows[0] ?? { error: 'No order matches that id and email.' },
    }
  }

  return { result: { error: `Unknown tool ${name}` } }
}
