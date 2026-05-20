// ── Helpers para el CRM ──────────────────────────────────────────────────────

import type { ClienteEtapa, ContactoTipo } from '@prisma/client'

/**
 * Cadencia esperada por etapa (en días).
 *   A — semanal       (7 días)
 *   B — quincenal     (14 días)
 *   C — mensual       (30 días)
 *   D — trimestral    (90 días)
 */
export const CADENCIA_DIAS: Record<ClienteEtapa, number> = {
  A: 7,
  B: 14,
  C: 30,
  D: 90,
}

/**
 * Cuántos toques sugiere "Generar plan 90 días" según etapa.
 *   A — 13 (semanal × 90/7)
 *   B — 6  (quincenal × 90/14)
 *   C — 3  (mensual × 90/30)
 *   D — 1  (trimestral × 90/90)
 */
export const TOQUES_90D: Record<ClienteEtapa, number> = {
  A: 13,
  B: 6,
  C: 3,
  D: 1,
}

export const ETAPA_LABEL: Record<ClienteEtapa, string> = {
  A: 'A — Cierre <90d',
  B: 'B — 90-180d',
  C: 'C — Largo plazo / SOI',
  D: 'D — Sin calificar',
}

export const ETAPA_CADENCIA_LABEL: Record<ClienteEtapa, string> = {
  A: 'semanal',
  B: 'quincenal',
  C: 'mensual',
  D: 'trimestral',
}

/**
 * Limpia y normaliza un teléfono mexicano para usar en wa.me.
 * "55 1234 5678" → "525512345678"
 * "(55) 1234-5678" → "525512345678"
 * "+52 55 1234 5678" → "525512345678"
 */
export function whatsappLink(telefono: string, mensaje?: string): string {
  const digits = telefono.replace(/\D/g, '')
  const withCC = digits.startsWith('52') ? digits : `52${digits}`
  const base = `https://wa.me/${withCC}`
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}

/**
 * Días desde la última fecha (positivo si en el pasado).
 * null si la fecha es null.
 */
export function diasDesde(fecha: Date | string | null): number | null {
  if (!fecha) return null
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Estado visual de la cadencia: verde si dentro, amarillo cerca, rojo pasado.
 *   - sin contacto previo: amarillo (necesita primer contacto)
 *   - dentro de cadencia: verde
 *   - 1× cadencia a 2× cadencia: amarillo
 *   - > 2× cadencia: rojo
 */
export type CadenciaEstado = 'verde' | 'amarillo' | 'rojo' | 'gris'

export function estadoCadencia(
  ultimoContactoAt: Date | string | null,
  etapa: ClienteEtapa,
): CadenciaEstado {
  if (!ultimoContactoAt) return 'amarillo'
  const dias = diasDesde(ultimoContactoAt) ?? 0
  const cadencia = CADENCIA_DIAS[etapa]
  if (dias <= cadencia) return 'verde'
  if (dias <= cadencia * 2) return 'amarillo'
  return 'rojo'
}

/**
 * Plantilla por defecto al generar plan: tipo rotando + resumen vacío.
 * El usuario edita cada toque cuando se acerque la fecha.
 */
const ROTACION_TIPOS: ContactoTipo[] = ['WHATSAPP', 'LLAMADA', 'EMAIL', 'WHATSAPP', 'LLAMADA']

export function generarTipoPlan(indice: number): ContactoTipo {
  return ROTACION_TIPOS[indice % ROTACION_TIPOS.length]
}

/**
 * Fechas equiespaciadas a lo largo de 90 días para N toques.
 * Empieza al día (cadencia/2) para no abrumar el primer día,
 * y termina antes del día 90.
 */
export function fechasPlan90Dias(numToques: number, desde: Date = new Date()): Date[] {
  if (numToques <= 0) return []
  const intervalo = 90 / (numToques + 1)
  const fechas: Date[] = []
  for (let i = 1; i <= numToques; i++) {
    const d = new Date(desde)
    d.setDate(d.getDate() + Math.round(intervalo * i))
    fechas.push(d)
  }
  return fechas
}
