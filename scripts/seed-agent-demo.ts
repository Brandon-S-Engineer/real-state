// Crea el schema `agent_demo` (pgvector + tablas) y carga los datos del demo
// "Company Data Agent". Idempotente: borra y recrea solo ese schema.
//
//   npm run seed:agent-demo

import { PrismaClient } from '@prisma/client'
import { docs, products, orders } from '../src/lib/agent-demo/data'
import { embed } from '../src/lib/agent-demo/openai'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS agent_demo CASCADE')
  await prisma.$executeRawUnsafe('CREATE SCHEMA agent_demo')
  await prisma.$executeRawUnsafe(`CREATE TABLE agent_demo.doc_chunks (
    id text PRIMARY KEY, title text NOT NULL, heading text NOT NULL, body text NOT NULL,
    embedding vector(1536) NOT NULL)`)
  await prisma.$executeRawUnsafe(`CREATE TABLE agent_demo.products (
    sku text PRIMARY KEY, model text NOT NULL, storage_gb int NOT NULL, grade char(1) NOT NULL,
    color text NOT NULL, price_mxn int NOT NULL, stock int NOT NULL, battery_health int NOT NULL)`)
  await prisma.$executeRawUnsafe(`CREATE TABLE agent_demo.orders (
    id text PRIMARY KEY, customer_email text NOT NULL, sku text NOT NULL REFERENCES agent_demo.products(sku),
    status text NOT NULL, total_mxn int NOT NULL, created_at date NOT NULL, shipped_at date,
    carrier text, tracking text)`)

  // Un chunk por sección: los documentos son cortos y cada sección es una idea.
  const chunks = docs.flatMap((d) =>
    d.sections.map((s, i) => ({ id: `${d.slug}#${i + 1}`, title: d.title, heading: s.heading, body: s.body })),
  )
  const vectors = await embed(chunks.map((c) => `${c.title} — ${c.heading}\n${c.body}`))
  for (const [i, c] of chunks.entries()) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO agent_demo.doc_chunks (id, title, heading, body, embedding) VALUES ($1,$2,$3,$4,$5::vector)',
      c.id, c.title, c.heading, c.body, `[${vectors[i].join(',')}]`,
    )
  }
  for (const p of products) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO agent_demo.products VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      p.sku, p.model, p.storage_gb, p.grade, p.color, p.price_mxn, p.stock, p.battery_health,
    )
  }
  for (const o of orders) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO agent_demo.orders VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9)',
      o.id, o.customer_email, o.sku, o.status, o.total_mxn, o.created_at, o.shipped_at, o.carrier, o.tracking,
    )
  }
  console.log(`agent_demo listo: ${chunks.length} chunks, ${products.length} productos, ${orders.length} órdenes`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
