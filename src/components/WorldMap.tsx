import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RELIEF_BASE_SCALE, RELIEF_LAP, RELIEF_TILE, RELIEF_TILES } from '../data/relief-tiles'
import { easyContinent } from '../lib/easy'
import { BY_ID, COUNTRIES, WORLD } from '../lib/geo'
import type { Box, Level } from '../lib/types'

export type Mark = 'right' | 'wrong' | 'reveal'

interface Props {
  /** Ausschnitt in Kartenkoordinaten. Ändert er sich, fährt die Karte dorthin. */
  view: Box
  levels: Record<string, Level>
  /** Orte, die abgefragt werden. Alles andere ist gedimmt und nicht antippbar. */
  pool: Set<string>
  marks?: Record<string, Mark>
  /** Gebirgsschattierung über dem Land einblenden. */
  relief?: boolean
  /** Sehr kleine Länder zusätzlich als Punkt markieren. */
  pins?: boolean
  interactive?: boolean
  onPick?: (id: string) => void
  /** Platz in Pixeln, den Bedienelemente über und unter der Karte verdecken. */
  inset?: { top: number; bottom: number }
  label?: string
}

interface T {
  k: number
  x: number
  y: number
}

const TINY = COUNTRIES.filter((c) => c.tiny && c.d)
const PIN_R = 5.5
const BASE = import.meta.env.BASE_URL

function WorldMapInner({
  view,
  levels,
  pool,
  marks,
  relief = false,
  pins = false,
  interactive = true,
  onPick,
  inset = { top: 0, bottom: 0 },
  label = 'Weltkarte',
}: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const layer = useRef<SVGGElement>(null)
  const t = useRef<T>({ k: 1, x: 0, y: 0 })
  const size = useRef({ w: 0, h: 0 })
  const anim = useRef(0)
  const insetRef = useRef(inset)
  insetRef.current = inset
  const pickRef = useRef(onPick)
  pickRef.current = onPick

  const pinLayer = useRef<SVGGElement>(null)
  const reliefRef = useRef(relief)
  reliefRef.current = relief
  /** Relief-Kacheln für den sichtbaren Ausschnitt, sobald die Übersicht zu grob wird. */
  const [tiles, setTiles] = useState<string[]>([])
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set())
  const tileTimer = useRef(0)

  const pickTiles = useCallback(() => {
    const { k, x, y } = t.current
    const { w, h } = size.current
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    let next: string[] = []
    if (reliefRef.current && w && k * dpr > RELIEF_BASE_SCALE * 1.2) {
      const x0 = Math.max(0, Math.floor(-x / k / RELIEF_TILE))
      const x1 = Math.min(WORLD.w / RELIEF_TILE - 1, Math.floor((w - x) / k / RELIEF_TILE))
      const y0 = Math.max(0, Math.floor(-y / k / RELIEF_TILE))
      const y1 = Math.min(WORLD.h / RELIEF_TILE - 1, Math.floor((h - y) / k / RELIEF_TILE))
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++) if (RELIEF_TILES.has(`${tx}_${ty}`)) next.push(`${tx}_${ty}`)
      if (next.length > 16) next = []
    }
    setTiles((cur) => (cur.join() === next.join() ? cur : next))
  }, [])

  const apply = useCallback(() => {
    const { k, x, y } = t.current
    layer.current?.setAttribute('transform', `translate(${x} ${y}) scale(${k})`)
    // Punkte behalten ihre Bildschirmgröße und verschwinden, sobald das Land groß genug ist.
    const nodes = pinLayer.current?.children
    if (nodes) {
      for (let i = 0; i < nodes.length; i++) {
        const g = nodes[i] as SVGGElement
        const show = Number(g.dataset.span) * k < 20
        g.style.display = show ? '' : 'none'
        if (show) g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / k})`)
      }
    }
    if (reliefRef.current) {
      clearTimeout(tileTimer.current)
      tileTimer.current = window.setTimeout(pickTiles, 160)
    }
  }, [pickTiles])

  useEffect(() => () => clearTimeout(tileTimer.current), [])
  // Neu eingehängte Punkte ausrichten, Kacheln beim Wechsel des Themes anpassen.
  useEffect(apply)
  useEffect(pickTiles, [relief, pickTiles])

  const target = useCallback((box: Box): T => {
    const { w, h } = size.current
    const { top, bottom } = insetRef.current
    const pad = 12
    const bw = box[2] - box[0]
    const bh = box[3] - box[1]
    const k = Math.min((w - pad * 2) / bw, (h - top - bottom - pad * 2) / bh)
    return {
      k,
      x: w / 2 - k * (box[0] + bw / 2),
      y: top + (h - top - bottom) / 2 - k * (box[1] + bh / 2),
    }
  }, [])

  const flyTo = useCallback(
    (box: Box, animate: boolean) => {
      cancelAnimationFrame(anim.current)
      const to = target(box)
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!animate || calm) {
        t.current = to
        apply()
        return
      }
      const from = { ...t.current }
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 620)
        const e = 1 - Math.pow(1 - p, 4)
        // Maßstab geometrisch überblenden, damit sich das Zoomen gleichmäßig anfühlt.
        const k = from.k * Math.pow(to.k / from.k, e)
        t.current = { k, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }
        apply()
        if (p < 1) anim.current = requestAnimationFrame(step)
      }
      anim.current = requestAnimationFrame(step)
    },
    [apply, target],
  )

  // Größe verfolgen und Ausschnitt halten.
  const viewRef = useRef(view)
  useLayoutEffect(() => {
    const el = svg.current!
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      size.current = { w: r.width, h: r.height }
      el.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`)
      flyTo(viewRef.current, false)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(anim.current)
    }
  }, [flyTo])

  const viewKey = view.join(',')
  useEffect(() => {
    viewRef.current = view
    if (size.current.w) flyTo(view, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, flyTo])

  // Gesten: ziehen, mit zwei Fingern zoomen, Mausrad, antippen.
  useEffect(() => {
    const el = svg.current
    if (!el || !interactive) return
    const pts = new Map<number, { x: number; y: number }>()
    let down: { x: number; y: number; time: number } | null = null
    let moved = false

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const limits = () => {
      const base = target([0, 0, WORLD.w, WORLD.h]).k
      return { min: base * 0.8, max: base * 140 }
    }
    const clamp = () => {
      const { w, h } = size.current
      const c = t.current
      const m = 80
      c.x = Math.min(w - m, Math.max(m - WORLD.w * c.k, c.x))
      c.y = Math.min(h - m, Math.max(m - WORLD.h * c.k, c.y))
    }
    const zoomAt = (px: number, py: number, factor: number) => {
      const c = t.current
      const { min, max } = limits()
      const k = Math.min(max, Math.max(min, c.k * factor))
      const f = k / c.k
      t.current = { k, x: px - (px - c.x) * f, y: py - (py - c.y) * f }
    }

    const onDown = (e: PointerEvent) => {
      cancelAnimationFrame(anim.current)
      el.setPointerCapture(e.pointerId)
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) {
        down = { ...p, time: e.timeStamp }
        moved = false
      } else {
        moved = true
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const p = local(e)
      if (pts.size === 1) {
        if (down && Math.hypot(p.x - down.x, p.y - down.y) > 8) moved = true
        if (moved) {
          t.current.x += p.x - prev.x
          t.current.y += p.y - prev.y
        }
      } else if (pts.size === 2) {
        const other = [...pts.entries()].find(([id]) => id !== e.pointerId)![1]
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(p.x - other.x, p.y - other.y)
        const mid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 }
        if (before > 0) zoomAt(mid.x, mid.y, after / before)
        t.current.x += (p.x - prev.x) / 2
        t.current.y += (p.y - prev.y) / 2
      }
      pts.set(e.pointerId, p)
      if (moved) {
        clamp()
        apply()
      }
    }
    const onUp = (e: PointerEvent) => {
      const had = pts.delete(e.pointerId)
      if (!had || pts.size > 0) return
      if (!moved && down && e.timeStamp - down.time < 600 && e.type === 'pointerup') {
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-id]')
        const id = hit?.getAttribute('data-id')
        if (id) pickRef.current?.(id)
      }
      down = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnimationFrame(anim.current)
      const p = local(e)
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0022))
      clamp()
      apply()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [interactive, apply, target])

  // Die Übersicht weicht den Kacheln erst, wenn alle geladen sind, sonst blitzt die Karte kurz ohne Relief.
  const tilesReady = tiles.length > 0 && tiles.every((k) => loaded.has(k))

  const cls = (id: string) => {
    const m = marks?.[id]
    if (m) return `land is-${m}`
    if (!pool.has(id)) return 'land is-out'
    const c = BY_ID[id]
    return `land lv${levels[id] ?? 0} c${c?.col ?? 0}${c ? ` k-${easyContinent(c)}` : ''}`
  }

  return (
    <svg
      ref={svg}
      className={`map${interactive ? ' map--live' : ''}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <g ref={layer}>
        <path className="map-sphere" d={WORLD.sphere} />
        <path className="land is-out" d={WORLD.neutral} />
        {COUNTRIES.map((c) =>
          c.d ? <path key={c.id} className={cls(c.id)} d={c.d} data-id={pool.has(c.id) ? c.id : undefined} /> : null,
        )}
        {relief && (
          <image
            className="map-relief"
            href={`${BASE}relief.webp`}
            width={WORLD.w}
            height={WORLD.h}
            preserveAspectRatio="none"
            style={tilesReady ? { display: 'none' } : undefined}
          />
        )}
        {relief && (
          <g style={tilesReady ? undefined : { opacity: 0 }}>
            {tiles.map((key) => {
              const [tx, ty] = key.split('_').map(Number)
              const x0 = Math.max(0, tx * RELIEF_TILE - RELIEF_LAP)
              const y0 = Math.max(0, ty * RELIEF_TILE - RELIEF_LAP)
              const x1 = Math.min(WORLD.w, (tx + 1) * RELIEF_TILE + RELIEF_LAP)
              const y1 = Math.min(WORLD.h, (ty + 1) * RELIEF_TILE + RELIEF_LAP)
              return (
                <image
                  key={key}
                  className="map-relief"
                  href={`${BASE}relief/${key}.webp`}
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={y1 - y0}
                  preserveAspectRatio="none"
                  onLoad={() => setLoaded((cur) => (cur.has(key) ? cur : new Set(cur).add(key)))}
                />
              )
            })}
          </g>
        )}
        {/* Markierte Länder zuletzt, damit ihr Rand über den Nachbarn liegt. */}
        {marks &&
          Object.keys(marks).map((id) => {
            const c = COUNTRIES.find((x) => x.id === id)
            return c?.d ? <path key={`m-${id}`} className={`land-ring is-${marks[id]}`} d={c.d} /> : null
          })}
        {/* Unsichtbare, breitere Tippfläche für sehr kleine Länder. */}
        {interactive &&
          TINY.filter((c) => pool.has(c.id)).map((c) => <path key={`h-${c.id}`} className="land-hit" d={c.d} data-id={c.id} />)}
        <g ref={pinLayer}>
          {pins &&
            TINY.filter((c) => pool.has(c.id)).map((c) => (
              <circle
                key={c.id}
                className={`pin ${marks?.[c.id] ? `is-${marks[c.id]}` : `lv${levels[c.id] ?? 0} c${c.col}`}`}
                r={PIN_R}
                data-id={interactive ? c.id : undefined}
                data-x={c.c[0]}
                data-y={c.c[1]}
                data-span={Math.max(c.box[2] - c.box[0], c.box[3] - c.box[1])}
              />
            ))}
        </g>
      </g>
    </svg>
  )
}

export const WorldMap = memo(WorldMapInner)
