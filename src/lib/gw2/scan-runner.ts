// ── Runner de scans en segundo plano ─────────────────────────────────────────
//
// "Recalcular" no debe bloquear la UI. El endpoint arranca el scan acá y
// devuelve al instante; el scan sigue corriendo en el proceso del server (dev
// persistente) y la UI consulta el estado con GET. Un scan por clave a la vez.
//
// Nota: en un entorno serverless (Vercel) el trabajo fire-and-forget se cortaría
// al responder; acá el server es persistente (uso personal), así que corre
// entero. Si algún día se despliega serverless, esto pasaría a una cola/cron.

type ScanState = { running: boolean; startedAt: number | null; finishedAt: number | null; lastResult: unknown; error: string | null }

const scans = new Map<string, ScanState>()

function stateFor(key: string): ScanState {
  let s = scans.get(key)
  if (!s) {
    s = { running: false, startedAt: null, finishedAt: null, lastResult: null, error: null }
    scans.set(key, s)
  }
  return s
}

/** Arranca el scan si no hay uno corriendo para esa clave. Devuelve si arrancó. */
export function startScan(key: string, fn: () => Promise<unknown>): boolean {
  const s = stateFor(key)
  if (s.running) return false
  s.running = true
  s.startedAt = Date.now()
  s.error = null
  // Fire-and-forget: no se await; el endpoint responde de inmediato.
  fn()
    .then((res) => { s.lastResult = res })
    .catch((err) => { s.error = err instanceof Error ? err.message : String(err); console.error(`scan[${key}] falló:`, err) })
    .finally(() => { s.running = false; s.finishedAt = Date.now() })
  return true
}

export function getScanState(key: string): ScanState {
  return stateFor(key)
}
