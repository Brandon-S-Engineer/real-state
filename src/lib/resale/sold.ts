// Un anuncio visto una sola vez que no vuelve a salir casi siempre es ruido de
// la búsqueda, no una venta: solo cuenta si se siguió al menos 20 h (misma
// regla que la tabla de rotación del dashboard).
export function isSold(r: { status: string; soldConfirmed: boolean; firstSeenAt: Date; lastSeenAt: Date }) {
  return r.status === 'DESAPARECIDO' && (r.soldConfirmed || r.lastSeenAt.getTime() - r.firstSeenAt.getTime() >= 20 * 3_600_000)
}
