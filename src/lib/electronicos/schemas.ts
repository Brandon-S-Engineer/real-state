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
