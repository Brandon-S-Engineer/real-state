'use client'

import { useEffect, useRef } from 'react'

/**
 * Corre `fn` cada `ms` mientras la pestaña está visible, y una vez al volver a ella.
 * Con la pestaña en segundo plano deja de consultar, así la base (Neon) puede apagarse sola.
 *
 * `hiddenWhileActiveMs`: si `fn` devuelve true (llegó algo nuevo), la pestaña oculta sigue
 * consultando hasta que pase ese tiempo sin nada nuevo — así las alertas en segundo plano
 * siguen llegando mientras la extensión está capturando, y se callan cuando deja de hacerlo.
 */
export function useVisiblePolling(
  fn: () => boolean | void | Promise<boolean | void>,
  ms: number,
  { immediate = false, hiddenWhileActiveMs = 0 }: { immediate?: boolean; hiddenWhileActiveMs?: number } = {},
) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let lastActivity = Date.now()
    let running = false
    const tick = async () => {
      const hidden = document.visibilityState !== 'visible'
      if (hidden && Date.now() - lastActivity > hiddenWhileActiveMs) return
      if (running) return
      running = true
      try { if (await fnRef.current()) lastActivity = Date.now() } finally { running = false }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') { lastActivity = Date.now(); void tick() } }
    if (immediate) void tick()
    const timer = setInterval(() => void tick(), ms)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [ms, immediate, hiddenWhileActiveMs])
}
