import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', name: 'Admin', password: hashedPassword, role: 'ADMIN' },
  })

  const edithPassword = await bcrypt.hash('Eory2507', 10)
  await prisma.user.upsert({
    where: { email: 'edithia.07@gmail.com' },
    update: {},
    create: { email: 'edithia.07@gmail.com', name: 'Edith Soria', password: edithPassword, role: 'ADMIN' },
  })

  const names = ['Sofia García', 'Carlos López', 'María Martínez', 'Juan Rodríguez', 'Ana Sánchez', 'Luis Hernández', 'Carmen Díaz', 'Pedro Morales']

  for (const name of names) {
    const email = `${name.split(' ')[0].toLowerCase()}@test.com`
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, password: hashedPassword, role: 'USER' },
    })
  }

  // Plantillas de bienes raíces se siembran con:
  //   npx tsx --tsconfig scripts/tsconfig.json scripts/seed-plantillas.ts

  return NextResponse.json({ ok: true })
}
