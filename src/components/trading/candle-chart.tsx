'use client'

// ── Gráfica de velas ─────────────────────────────────────────────────────────
//
// SVG a mano, siguiendo las convenciones de src/components/dashboard/charts.tsx
// (ResizeObserver para el ancho, tooltip HTML posicionado en absoluto). No se usa
// librería: el repo entero grafica así y una dependencia de charting pesa más que
// estas ~200 líneas.
//
// A diferencia del resto del CRM, esta gráfica NO sigue el tema de la página:
// siempre va en oscuro (ver `T` abajo).
//
// Diferencia clave con `charts.tsx`: ahí el eje X es CATEGÓRICO (etiquetas
// equiespaciadas). Acá también lo es, y a propósito — en mercados con fines de
// semana y feriados, un eje de tiempo lineal deja huecos enormes de vacío. Todos
// los terminales profesionales indexan por vela, no por tiempo real. Las
// etiquetas sí muestran la fecha/hora real de cada vela.
//
// El zoom se hace sobre una ventana [desde, hasta) de índices; el paneo la
// desplaza. El padre solo pide más velas cuando hacen falta.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Bar } from '@/lib/trading/bars'
import { OVERLAYS, type OverlayKey, type Serie } from '@/lib/trading/indicators'

// La gráfica tiene tema OSCURO PROPIO, no sigue el de la página. Es a propósito:
// sobre fondo oscuro los verdes, rojos y azules contrastan mucho mejor que sobre
// blanco, y así el precio se lee igual sin importar cómo esté el resto del CRM.
// Por eso acá los colores son literales y no tokens de tema — si usara
// `currentColor` o `fill-muted-foreground`, en modo claro quedaría texto oscuro
// sobre fondo oscuro.
const T = {
  fondo: '#0e1117',
  rejilla: 'rgba(255,255,255,0.06)',
  separador: 'rgba(255,255,255,0.10)',
  texto: '#8b93a1',
  textoFuerte: '#e6e9ef',
  cruz: 'rgba(255,255,255,0.32)',
  alcista: '#22c55e',
  bajista: '#ef4444',
  panel: 'rgba(14,17,23,0.88)',
}

type Props = {
  bars: Bar[]
  digits: number
  height?: number
  overlays?: OverlayKey[]
  /** Etiqueta de tiempo por vela, ya formateada por el padre según temporalidad. */
  formatTime: (t: number) => string
}

export default function CandleChart({ bars, digits, height = 460, overlays = [], formatTime }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [w, setW] = useState(900)
  const [hover, setHover] = useState<number | null>(null)
  // Ventana visible en índices de vela. null = todo.
  const [win, setWin] = useState<{ from: number; to: number } | null>(null)
  const drag = useRef<{ x: number; from: number; to: number } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])


  // Al cargar velas nuevas se muestra el tramo RECIENTE, no todo el historial:
  // con 3000 velas en pantalla no se distingue una vela de otra. Se puede alejar
  // con la rueda.
  const VISIBLE_INICIAL = 320
  useEffect(() => {
    if (bars.length === 0) return setWin(null)
    const from = Math.max(0, bars.length - VISIBLE_INICIAL)
    setWin({ from, to: bars.length })
  }, [bars])

  // El zoom se engancha como listener NATIVO no pasivo. React registra `onWheel`
  // como pasivo, así que ahí `preventDefault()` no surte efecto y la página
  // scrollea mientras intentás hacer zoom en la gráfica.
  //
  // El ref guarda siempre el handler más fresco (se reasigna en cada render con
  // la ventana actual), y el listener se engancha una sola vez por montaje del
  // <svg>. La dependencia en `bars.length === 0` importa: el <svg> no existe
  // mientras no hay velas, así que hay que reenganchar cuando aparecen.
  const onWheelRef = useRef<(e: WheelEvent) => void>(() => {})
  const sinVelas = bars.length === 0
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e: WheelEvent) => onWheelRef.current(e)
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [sinVelas])

  const up = T.alcista
  const down = T.bajista

  const view = useMemo(() => {
    const from = Math.max(0, win?.from ?? 0)
    const to = Math.min(bars.length, win?.to ?? bars.length)
    return { from, to, slice: bars.slice(from, to) }
  }, [bars, win])

  const series = useMemo(() => {
    const out: { key: string; color: string; values: Serie }[] = []
    for (const o of OVERLAYS) {
      if (!overlays.includes(o.key)) continue
      out.push({ key: o.key, color: o.color, values: o.fn(bars) })
    }
    return out
  }, [bars, overlays])

  // Geometría: el alto se reparte explícitamente entre precio, hueco, volumen y
  // la franja de etiquetas de tiempo. Sin este reparto las etiquetas terminaban
  // dibujadas ENCIMA de las barras de volumen.
  const pad = { l: 8, r: 66, t: 10, b: 26 }
  const GAP = 10
  const plotH = Math.max(80, height - pad.t - pad.b)
  const volH = Math.round(plotH * 0.18)
  const priceH = plotH - volH - GAP
  const iw = Math.max(80, w - pad.l - pad.r)
  const n = view.slice.length

  if (n === 0) {
    return (
      <div
        ref={ref}
        className='w-full flex items-center justify-center text-sm rounded-lg'
        style={{ height, background: T.fondo, color: T.texto }}>
        Sin velas en este rango.
      </div>
    )
  }

  // Escala de precio: sobre lo VISIBLE, incluyendo las superposiciones para que
  // una EMA200 fuera de rango no quede cortada.
  let lo = Infinity
  let hi = -Infinity
  for (const b of view.slice) {
    if (b.l < lo) lo = b.l
    if (b.h > hi) hi = b.h
  }
  for (const s of series) {
    for (let i = view.from; i < view.to; i++) {
      const v = s.values[i]
      if (v == null) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  const span = hi - lo || 1
  const yLo = lo - span * 0.06
  const yHi = hi + span * 0.06
  const yRange = yHi - yLo || 1
  const yOf = (p: number) => pad.t + priceH - ((p - yLo) / yRange) * priceH

  const step = iw / n
  const bodyW = Math.max(1, Math.min(14, step * 0.68))
  const xOf = (i: number) => pad.l + (i + 0.5) * step

  const maxVol = Math.max(...view.slice.map((b) => b.v), 1)
  const volTop = pad.t + priceH + GAP
  const volBottom = volTop + volH
  const yVol = (v: number) => volBottom - (v / maxVol) * volH

  const fmt = (v: number) => v.toFixed(digits)

  // Ticks de precio a la derecha (como cualquier terminal).
  const ticks = 5
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = yLo + (yRange * i) / ticks
    return { v, y: yOf(v) }
  })

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 92))))

  const idxFromEvent = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect()
    const i = Math.floor((clientX - rect.left - pad.l) / step)
    return Math.max(0, Math.min(n - 1, i))
  }

  onWheelRef.current = (e: WheelEvent) => {
    e.preventDefault()
    const cur = { from: view.from, to: view.to }
    const total = cur.to - cur.from
    // El zoom escala con la INTENSIDAD real del gesto, no un salto fijo por
    // evento: un trackpad dispara decenas de eventos chiquitos por gesto, así que
    // un factor fijo lo volvía inusable de rápido. 1.05 por "muesca" de rueda
    // (~100 de deltaY), y se acota para que un golpe fuerte no salte de más.
    const muescas = Math.min(Math.abs(e.deltaY) / 100, 2)
    const factor = Math.pow(1.05, Math.sign(e.deltaY) * muescas)
    const clamped = Math.max(20, Math.min(bars.length, Math.round(total * factor)))
    // Zoom anclado al cursor: la vela bajo el puntero se queda donde está.
    const svg = e.currentTarget as SVGSVGElement
    const anchor = cur.from + idxFromEvent(e.clientX, svg)
    const ratio = total > 0 ? (anchor - cur.from) / total : 0.5
    const raw = Math.round(anchor - ratio * clamped)
    const from = Math.max(0, Math.min(bars.length - clamped, raw))
    setWin({ from, to: from + clamped })
  }

  const onDown = (e: React.MouseEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, from: view.from, to: view.to }
  }
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    setHover(idxFromEvent(e.clientX, e.currentTarget))
    const d = drag.current
    if (!d) return
    const total = d.to - d.from
    const shift = Math.round((d.x - e.clientX) / step)
    const from = Math.max(0, Math.min(bars.length - total, d.from + shift))
    setWin({ from, to: from + total })
  }
  const endDrag = () => {
    drag.current = null
  }

  const hb = hover != null ? view.slice[hover] : null
  const hoverGlobal = hover != null ? view.from + hover : null

  return (
    <div ref={ref} className='relative w-full select-none rounded-lg overflow-hidden' style={{ height, background: T.fondo }}>
      <svg
        ref={svgRef}
        width={w}
        height={height}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={() => {
          endDrag()
          setHover(null)
        }}
        className={drag.current ? 'cursor-grabbing' : 'cursor-crosshair'}>
        {/* rejilla + escala de precio a la derecha */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + iw} y1={t.y} y2={t.y} stroke={T.rejilla} strokeDasharray='2 3' />
            <text x={pad.l + iw + 6} y={t.y + 4} fontSize='10' fill={T.texto} className='tabular-nums'>
              {fmt(t.v)}
            </text>
          </g>
        ))}

        {/* velas */}
        {view.slice.map((b, i) => {
          const x = xOf(i)
          const alcista = b.c >= b.o
          const col = alcista ? up : down
          const yO = yOf(b.o)
          const yC = yOf(b.c)
          const top = Math.min(yO, yC)
          const hgt = Math.max(1, Math.abs(yC - yO))
          return (
            <g key={b.t}>
              <line x1={x} x2={x} y1={yOf(b.h)} y2={yOf(b.l)} stroke={col} strokeWidth={Math.max(1, bodyW * 0.14)} />
              <rect x={x - bodyW / 2} y={top} width={bodyW} height={hgt} fill={col} />
            </g>
          )
        })}

        {/* superposiciones (EMA…) */}
        {series.map((s) => {
          let d = ''
          let started = false
          for (let i = view.from; i < view.to; i++) {
            const v = s.values[i]
            if (v == null) {
              started = false
              continue
            }
            const x = xOf(i - view.from)
            const y = yOf(v)
            d += `${started ? 'L' : 'M'} ${x} ${y} `
            started = true
          }
          return <path key={s.key} d={d} fill='none' stroke={s.color} strokeWidth='1.4' strokeLinejoin='round' opacity='0.95' />
        })}

        {/* volumen */}
        <line x1={pad.l} x2={pad.l + iw} y1={volTop} y2={volTop} stroke={T.separador} />
        {view.slice.map((b, i) => {
          const x = xOf(i)
          const y = yVol(b.v)
          return (
            <rect
              key={b.t}
              x={x - bodyW / 2}
              y={y}
              width={bodyW}
              height={Math.max(0.5, volBottom - y)}
              fill={b.c >= b.o ? up : down}
              opacity='0.34'
            />
          )
        })}

        {/* etiquetas de tiempo — en la franja reservada bajo el volumen */}
        {view.slice.map((b, i) => {
          if (i % labelEvery !== 0) return null
          // Se omiten las que quedarían cortadas contra cualquiera de los bordes.
          const x = xOf(i)
          if (x < pad.l + 30 || x > pad.l + iw - 30) return null
          return (
            <text key={b.t} x={x} y={height - 8} textAnchor='middle' fontSize='10' fill={T.texto}>
              {formatTime(b.t)}
            </text>
          )
        })}

        {/* crosshair */}
        {hover != null && hb && (
          <g pointerEvents='none'>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={pad.t} y2={volBottom} stroke={T.cruz} strokeDasharray='3 3' />
            <line x1={pad.l} x2={pad.l + iw} y1={yOf(hb.c)} y2={yOf(hb.c)} stroke={T.cruz} strokeDasharray='3 3' />
            <rect x={pad.l + iw + 2} y={yOf(hb.c) - 8} width={62} height={16} rx='2' fill={T.textoFuerte} />
            <text x={pad.l + iw + 33} y={yOf(hb.c) + 4} textAnchor='middle' fontSize='10' fill={T.fondo} className='tabular-nums'>
              {fmt(hb.c)}
            </text>
          </g>
        )}
      </svg>

      {/* datos de la vela bajo el cursor */}
      {hb && (
        <div
          className='absolute top-1 left-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums rounded px-2 py-1 pointer-events-none'
          style={{ background: T.panel, color: T.textoFuerte }}>
          <span style={{ color: T.texto }}>{formatTime(hb.t)}</span>
          <span>
            <span style={{ color: T.texto }}>A </span>
            {fmt(hb.o)}
          </span>
          <span>
            <span style={{ color: T.texto }}>M </span>
            {fmt(hb.h)}
          </span>
          <span>
            <span style={{ color: T.texto }}>m </span>
            {fmt(hb.l)}
          </span>
          <span style={{ color: hb.c >= hb.o ? T.alcista : T.bajista }}>
            <span style={{ color: T.texto }}>C </span>
            {fmt(hb.c)}
          </span>
          <span style={{ color: T.texto }}>vol {Math.round(hb.v).toLocaleString('es-MX')}</span>
          {series.map((s) => {
            const v = hoverGlobal != null ? s.values[hoverGlobal] : null
            if (v == null) return null
            return (
              <span key={s.key} style={{ color: s.color }}>
                {OVERLAYS.find((o) => o.key === s.key)?.label} {fmt(v)}
              </span>
            )
          })}
        </div>
      )}

      <div
        className='absolute top-1 right-2 text-[10px] pointer-events-none rounded px-1.5 py-0.5'
        style={{ background: T.panel, color: T.texto }}>
        {n} de {bars.length} velas · rueda = zoom · arrastrar = mover
      </div>
    </div>
  )
}
