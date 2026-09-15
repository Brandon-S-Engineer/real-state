/**
 * Precalienta TODOS los caches de los ítems ligados a eventos para que la sección
 * abra instantánea (sin esperas ni en la lista ni al abrir cada ítem):
 *   1. Snapshot de precios actuales (1 request bulk, cubre todo el TP de una).
 *   2. Historial diario multi-año (para las gráficas de años).
 *   3. Historial horario 7 días (para las gráficas de 7 días).
 *   4. Order book (profundidad) por ítem.
 * Todo incremental: lo ya cacheado se salta casi gratis. Uso: npm run prewarm:gw2-events
 */
import { allEventItemIds } from '@/content/gw2-events'
import { ensureDailyHistoryFresh } from '@/lib/gw2/daily-history'
import { ensureMarketHistoryFresh } from '@/lib/gw2/market-history'
import { getCurrentPrices, getOrderBook } from '@/lib/gw2/prices-cache'

async function main() {
  const ids = allEventItemIds()
  console.log(`Precalentando caches de ${ids.length} ítems de eventos...`)

  // 1. Snapshot de precios (un solo request cubre a todos).
  console.time('  snapshot de precios')
  await getCurrentPrices(ids)
  console.timeEnd('  snapshot de precios')

  let done = 0
  for (const id of ids) {
    const t0 = Date.now()
    try {
      const [daily] = await Promise.all([
        ensureDailyHistoryFresh(id),
        ensureMarketHistoryFresh([id]),
        getOrderBook(id),
      ])
      console.log(`  [${++done}/${ids.length}] #${id} — ${daily.length} días diarios (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
    } catch (err) {
      console.error(`  [${++done}/${ids.length}] #${id} — ERROR`, err instanceof Error ? err.message : err)
    }
  }
  console.log('Listo — sección de eventos precalentada.')
  process.exit(0)
}
main()
