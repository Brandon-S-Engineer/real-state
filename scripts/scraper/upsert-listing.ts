import { PrismaClient } from "@prisma/client"
import type { RawListing } from "./inmuebles24.js"

/**
 * Inserta o actualiza un listing y registra cambios de precio en PriceHistory.
 * Devuelve si fue "new", "updated" (precio cambió) o "unchanged".
 */
export async function upsertListing(
  prisma: PrismaClient,
  raw: RawListing
): Promise<"new" | "updated" | "unchanged"> {
  const existing = await prisma.listing.findUnique({
    where: { sourceId: raw.sourceId },
  })

  const now = new Date()

  if (!existing) {
    // Listing nuevo
    await prisma.listing.create({
      data: {
        sourceId: raw.sourceId,
        sourceUrl: raw.sourceUrl,
        title: raw.title,
        zona: raw.zona,
        desarrollo: raw.desarrollo,
        price: raw.price ?? 0,
        m2Constructed: raw.m2Constructed,
        m2Total: raw.m2Total,
        bedrooms: raw.bedrooms,
        bathrooms: raw.bathrooms,
        parkingSpaces: raw.parkingSpaces,
        images: raw.images,
        amenities: raw.amenities,
        status: "ACTIVE",
        firstSeenAt: now,
        lastSeenAt: now,
        lastCheckedAt: now,
        priceHistory: {
          create: {
            price: raw.price ?? 0,
            changeType: "INITIAL",
            recordedAt: now,
          },
        },
      },
    })
    return "new"
  }

  // Listing existente — actualizar lastSeenAt y lastCheckedAt siempre
  const priceChanged =
    raw.price !== null && Math.abs(existing.price - raw.price) > 1 // tolerancia $1

  const changeType =
    raw.price !== null && raw.price > existing.price ? "INCREASE" : "DECREASE"

  await prisma.listing.update({
    where: { id: existing.id },
    data: {
      // Actualizar campos que pueden cambiar entre scrapes
      title: raw.title,
      price: raw.price ?? existing.price,
      m2Constructed: raw.m2Constructed ?? existing.m2Constructed,
      m2Total: raw.m2Total ?? existing.m2Total,
      bedrooms: raw.bedrooms ?? existing.bedrooms,
      bathrooms: raw.bathrooms ?? existing.bathrooms,
      parkingSpaces: raw.parkingSpaces ?? existing.parkingSpaces,
      images: raw.images.length > 0 ? raw.images : (existing.images as string[]),
      amenities: raw.amenities.length > 0 ? raw.amenities : (existing.amenities as string[]),
      desarrollo: raw.desarrollo ?? existing.desarrollo,
      status: "ACTIVE", // Si lo vemos de nuevo, está activo
      lastSeenAt: now,
      lastCheckedAt: now,
      // Historial solo si cambió el precio
      ...(priceChanged && raw.price !== null
        ? {
            priceHistory: {
              create: {
                price: raw.price,
                changeType,
                recordedAt: now,
              },
            },
          }
        : {}),
    },
  })

  return priceChanged ? "updated" : "unchanged"
}

/**
 * Listings que estaban ACTIVE pero no aparecieron en este scrape
 * (lastSeenAt no se actualizó en esta sesión) → SUSPENDED.
 */
export async function suspendMissingListings(
  prisma: PrismaClient,
  zona: string,
  sessionStart: Date,
  suspendAfterHours: number
): Promise<number> {
  const cutoff = new Date(sessionStart.getTime() - suspendAfterHours * 60 * 60 * 1000)

  const result = await prisma.listing.updateMany({
    where: {
      zona,
      status: "ACTIVE",
      lastSeenAt: { lt: cutoff },
    },
    data: { status: "SUSPENDED" },
  })

  return result.count
}
