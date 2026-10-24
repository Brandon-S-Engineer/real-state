import { z } from 'zod'

export const zoneSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['COMPRA', 'VENTA', 'OTRA']),
  keywords: z.array(z.string()).default([]),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  radiusKm: z.number().positive().nullable().optional(),
  active: z.boolean().default(true),
})

export const tradeSchema = z.object({
  category: z.enum(['MACBOOK', 'IPHONE', 'IPAD', 'AUDIO', 'BOLSOS']).default('MACBOOK'),
  listingId: z.string().nullable().optional(),
  equipo: z.string().min(1),
  line: z.string().nullable().optional(),
  chip: z.string().nullable().optional(),
  ramGb: z.number().int().nullable().optional(),
  ssdGb: z.number().int().nullable().optional(),
  buyPrice: z.number().nonnegative(),
  buyDate: z.coerce.date(),
  buyZoneId: z.string().nullable().optional(),
  sellPrice: z.number().nonnegative().nullable().optional(),
  sellDate: z.coerce.date().nullable().optional(),
  sellZoneId: z.string().nullable().optional(),
  costs: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
})

export const searchSchema = z.object({
  // Texto para Marketplace o un link completo
  query: z.string().trim().min(1).max(2000),
  label: z.string().trim().max(80).nullable().optional(),
  groupName: z.string().trim().min(1).max(60).default('Mis búsquedas'),
  minPrice: z.number().int().nonnegative().nullable().optional(),
})

export const sectionSchema = z.object({
  name: z.string().trim().min(1).max(60),
})

const authCheckFields = {
  label: z.string().trim().min(1).max(300),
  how: z.string().trim().max(1000).nullable().optional(),
  stop: z.boolean().optional(),
}
export const authCheckCreateSchema = z.object({
  mode: z.enum(['COMPRA', 'VENTA']),
  product: z.enum(['IPHONE', 'IPAD', 'MACBOOK', 'AUDIFONOS', 'BOLSOS']),
  items: z.array(z.object(authCheckFields)).min(1).max(100),
})
export const authCheckUpdateSchema = z.object(authCheckFields).partial()
export const authCheckOrderSchema = z.object({ ids: z.array(z.string()).min(1).max(500) })
