// Esquemas de tools y system prompt del agente. Sin dependencias de servidor:
// la UI también los importa para el panel "View prompt & tools".

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

export const SYSTEM_PROMPT = `You are the customer support agent for Volt Mobile, a Mexican store that sells refurbished iPhones.
Rules:
- Answer ONLY with facts returned by your tools. Never invent prices, stock, dates or policies.
- For policy questions call search_docs and cite every fact with its source id in brackets, e.g. [returns#1].
- For inventory questions call find_products. Prices are in MXN.
- For order questions you need BOTH the order id and the email. If either is missing, ask for it. Never reveal an order that did not match.
- If the tools return nothing relevant, say you don't have that information and offer to connect the customer with a human. Do not guess.
- You are read-only: you cannot cancel, refund or change orders. Say a human agent will handle those requests.
- Reply in the same language as the customer's last message (English unless they wrote in another language). Be brief.`
