import { prisma } from '@/lib/db'
import type { FinanceEntry } from '@prisma/client'
import type { Area, FinanceEntryDTO, Kind } from './shared'

export function toEntryDTO(e: FinanceEntry): FinanceEntryDTO {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    kind: e.kind as Kind,
    area: e.area as Area,
    category: e.category,
    amount: e.amount,
    currency: e.currency === 'USD' ? 'USD' : 'MXN',
    fxRate: e.fxRate,
    amountMxn: e.amountMxn,
    note: e.note,
  }
}

export function getFinanceSettings() {
  return prisma.financeSettings.upsert({ where: { id: 'singleton' }, create: { id: 'singleton' }, update: {} })
}
