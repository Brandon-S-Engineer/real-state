'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Recalcular sin bloquear la pestaña: el POST arranca el scan en el server y
 * devuelve al instante; se consulta el estado con GET cada pocos segundos y,
 * cuando termina, se recarga la página para mostrar los datos nuevos. El usuario
 * puede navegar libremente mientras corre (si se va, el polling se limpia solo).
 * Si al montar ya hay un scan corriendo (arrancado antes o en otra pestaña), lo
 * refleja.
 */
export function useBackgroundScan(endpoint: string) {
  const [scanning, setScanning] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const j = await (await fetch(endpoint)).json()
        if (!j.running) {
          stopPolling()
          window.location.reload()
        }
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 3000)
  }

  useEffect(() => {
    let active = true
    fetch(endpoint)
      .then((r) => r.json())
      .then((j) => {
        if (active && j.running) {
          setScanning(true)
          startPolling()
        }
      })
      .catch(() => {})
    return () => {
      active = false
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  const start = async () => {
    setScanning(true)
    try {
      await fetch(endpoint, { method: 'POST' })
      startPolling()
    } catch {
      setScanning(false)
    }
  }

  return { scanning, start }
}
