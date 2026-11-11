import { geoContains, geoDistance, geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { feature, mesh } from 'topojson-client'
import urlHi from 'world-atlas/countries-50m.json?url'
import urlLo from 'world-atlas/countries-110m.json?url'
import { BY_ID, COUNTRIES } from '../lib/geo'
import type { Level, Region, Theme } from '../lib/types'
import type { Mark } from './WorldMap'

interface Props {
  /** Region, auf die der Globus ausgerichtet wird. */
  region: Region
  /** Land, das herangeholt wird (Auflösung einer Frage). */
  focus?: string | null
  levels: Record<string, Level>
  pool: Set<string>
  marks?: Record<string, Mark>
  pins?: boolean
  interactive?: boolean
  onPick?: (id: string) => void
  inset?: { top: number; bottom: number }
  label?: string
  /** Nur als Auslöser: Bei Themewechsel werden die Farben neu gelesen. */
  theme: Theme
}

interface Shape {
  id: string | null
  geo: GeoPermissibleObjects
}
interface Detail {
  shapes: Shape[]
  borders: GeoPermissibleObjects
}
interface Geo {
  hi: Detail
  lo: Detail
}

/** Blickpunkt (Länge, Breite) und Zoom relativ zum bildfüllenden Globus. */
const REGION_VIEW: Record<Region, { c: [number, number]; z: number }> = {
  welt: { c: [12, 22], z: 1 },
  europa: { c: [14, 53], z: 3.3 },
  asien: { c: [88, 32], z: 1.75 },
  afrika: { c: [18, 2], z: 1.9 },
  nordamerika: { c: [-98, 46], z: 1.85 },
  suedamerika: { c: [-60, -21], z: 2.1 },
  ozeanien: { c: [152, -22], z: 1.9 },
}

const BY_NUM = new Map(COUNTRIES.filter((c) => c.n).map((c) => [c.n, c.id]))
const BY_NAME: Record<string, string> = { Kosovo: 'XK', 'N. Cyprus': 'CY', Somaliland: 'SO' }
const TINY = COUNTRIES.filter((c) => c.tiny)
const DEG = 180 / Math.PI

let geoPromise: Promise<Geo> | null = null
function loadGeo(): Promise<Geo> {
  geoPromise ??= Promise.all(
    [urlHi, urlLo].map(async (url): Promise<Detail> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topo: any = await (await fetch(url)).json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc: any = feature(topo, topo.objects.countries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapes: Shape[] = fc.features.map((f: any) => {
        const id = (f.id != null && BY_NUM.get(String(f.id).padStart(3, '0'))) || BY_NAME[f.properties?.name] || null
        return { id: id === 'AQ' ? null : id, geo: f }
      })
      return { shapes, borders: mesh(topo, topo.objects.countries) as GeoPermissibleObjects }
    }),
  ).then(([hi, lo]) => ({ hi, lo }))
  return geoPromise
}

/** Feste Sterne, damit der Himmel bei jedem Start gleich aussieht. */
const STARS = (() => {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 170 }, () => ({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.1, a: 0.25 + rnd() * 0.65 }))
})()

function GlobeMapInner({
  region,
  focus = null,
  levels,
  pool,
  marks,
  pins = false,
  interactive = true,
  onPick,
  inset = { top: 0, bottom: 0 },
  label = 'Globus',
  theme,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const geo = useRef<Geo | null>(null)
  const size = useRef({ w: 0, h: 0 })
  /** Drehung (Länge, Breite der Bildmitte negiert) und Radius in Pixeln. */
  const cam = useRef({ lon: -REGION_VIEW.welt.c[0], lat: -REGION_VIEW.welt.c[1], r: 0 })
  const anim = useRef(0)
  const idle = useRef(0)
  const colors = useRef<Record<string, string>>({})
  const props = useRef({ levels, pool, marks, pins, inset, onPick })
  props.current = { levels, pool, marks, pins, inset, onPick }

  const center = () => {
    const { w, h } = size.current
    const { top, bottom } = props.current.inset
    return { cx: w / 2, cy: top + (h - top - bottom) / 2, base: Math.max(40, Math.min(w, h - top - bottom) / 2 - 10) }
  }

  const draw = useCallback((fine: boolean) => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    const { w, h } = size.current
    if (!el || !ctx || !w) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const col = colors.current
    const { cx, cy } = center()
    const { lon, lat, r } = cam.current
    const { levels, pool, marks, pins } = props.current

    // Weltall
    ctx.fillStyle = '#04060d'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    for (const s of STARS) {
      ctx.globalAlpha = s.a
      ctx.beginPath()
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Atmosphäre
    const glow = ctx.createRadialGradient(cx, cy, r * 0.97, cx, cy, r * 1.14)
    glow.addColorStop(0, 'rgba(120, 190, 255, 0.55)')
    glow.addColorStop(0.35, 'rgba(90, 160, 255, 0.2)')
    glow.addColorStop(1, 'rgba(90, 160, 255, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.14, 0, Math.PI * 2)
    ctx.fill()

    // Meer
    ctx.fillStyle = col.sea
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    const projection = geoOrthographic().translate([cx, cy]).scale(r).rotate([lon, lat]).clipAngle(90).precision(0.4)
    const path = geoPath(projection, ctx)
    const data = geo.current && (fine ? geo.current.hi : geo.current.lo)

    if (data) {
      // Länder nach Farbe bündeln: ein Füllvorgang je Farbe statt je Land.
      const groups = new Map<string, Shape[]>()
      for (const s of data.shapes) {
        const m = s.id ? marks?.[s.id] : undefined
        const fill = m
          ? m === 'wrong'
            ? col.wrong
            : m === 'pick'
              ? col.ring
              : col.right
          : !s.id || !pool.has(s.id)
            ? col.out
            : col.bunt
              ? col[`c${BY_ID[s.id].col}`]
              : col[`lv${levels[s.id] ?? 0}`]
        const list = groups.get(fill)
        if (list) list.push(s)
        else groups.set(fill, [s])
      }
      for (const [fill, list] of groups) {
        ctx.fillStyle = fill
        ctx.beginPath()
        for (const s of list) path(s.geo)
        ctx.fill()
      }
      ctx.strokeStyle = col.border
      ctx.lineWidth = 0.7
      ctx.lineJoin = 'round'
      ctx.beginPath()
      path(data.borders)
      ctx.stroke()

      if (marks) {
        ctx.strokeStyle = col.ring
        ctx.lineWidth = 2
        ctx.beginPath()
        for (const s of data.shapes) if (s.id && marks[s.id]) path(s.geo)
        ctx.stroke()
      }
    }

    // Licht von oben links, Schatten zum Rand: macht aus der Scheibe eine Kugel.
    const shade = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r)
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.13)')
    shade.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
    shade.addColorStop(0.82, 'rgba(4, 8, 30, 0.14)')
    shade.addColorStop(1, 'rgba(4, 8, 30, 0.5)')
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // Punkte für sehr kleine Länder, solange sie auf dem Bildschirm winzig sind.
    const mid: [number, number] = [-lon, -lat]
    for (const c of TINY) {
      if (!pool.has(c.id)) continue
      const m = marks?.[c.id]
      if (!pins && !m) continue
      const span = Math.max(c.box[2] - c.box[0], c.box[3] - c.box[1]) * 0.18
      if (!m && (span / DEG) * r > 20) continue
      if (geoDistance(c.ll, mid) > Math.PI / 2 - 0.03) continue
      const p = projection(c.ll)
      if (!p) continue
      ctx.fillStyle = m ? (m === 'wrong' ? col.wrong : m === 'pick' ? col.ring : col.right) : col.bunt ? col[`c${c.col}`] : col[`lv${levels[c.id] ?? 0}`]
      ctx.strokeStyle = col.pin
      ctx.lineWidth = m ? 3 : 1.5
      ctx.beginPath()
      ctx.arc(p[0], p[1], 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Während der Bewegung grob zeichnen, danach einmal in voller Auflösung. */
  const moving = useCallback(() => {
    draw(false)
    clearTimeout(idle.current)
    idle.current = window.setTimeout(() => draw(true), 130)
  }, [draw])

  const flyTo = useCallback(
    (c: [number, number], z: number, animate: boolean) => {
      cancelAnimationFrame(anim.current)
      const to = { lon: -c[0], lat: -c[1], r: center().base * z }
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!animate || calm || !cam.current.r) {
        cam.current = to
        draw(true)
        return
      }
      const from = { ...cam.current }
      // Kürzesten Weg um die Kugel nehmen.
      const dLon = ((to.lon - from.lon + 540) % 360) - 180
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 760)
        const e = 1 - Math.pow(1 - p, 4)
        cam.current = {
          lon: from.lon + dLon * e,
          lat: from.lat + (to.lat - from.lat) * e,
          r: from.r * Math.pow(to.r / from.r, e),
        }
        if (p < 1) {
          draw(false)
          anim.current = requestAnimationFrame(step)
        } else draw(true)
      }
      anim.current = requestAnimationFrame(step)
    },
    [draw],
  )

  const aim = useCallback(
    (animate: boolean) => {
      const c = focus ? BY_ID[focus] : null
      if (c) {
        const span = Math.max(c.box[2] - c.box[0], c.box[3] - c.box[1]) * 0.18
        flyTo(c.ll, c.tiny ? 14 : Math.min(12, Math.max(2.2, 70 / Math.max(span, 4))), animate)
      } else {
        const v = REGION_VIEW[region]
        flyTo(v.c, v.z, animate)
      }
    },
    [focus, region, flyTo],
  )
  const aimRef = useRef(aim)
  aimRef.current = aim

  const readColors = useCallback(() => {
    const css = getComputedStyle(document.documentElement)
    const v = (name: string) => css.getPropertyValue(name).trim()
    const border = v('--border')
    colors.current = {
      sea: v('--sea'),
      out: v('--land-out'),
      lv0: v('--lv0'),
      lv1: v('--lv1'),
      lv2: v('--lv2'),
      lv3: v('--lv3'),
      c0: v('--c0'),
      c1: v('--c1'),
      c2: v('--c2'),
      c3: v('--c3'),
      c4: v('--c4'),
      c5: v('--c5'),
      right: v('--right').startsWith('var') ? v('--lime') : v('--right'),
      wrong: v('--wrong'),
      ring: v('--ring'),
      pin: v('--pin-stroke'),
      border: border.startsWith('var') ? v('--sea') : border,
      bunt: document.documentElement.dataset.theme === 'bunt' ? '1' : '',
    }
  }, [])

  // Größe verfolgen, Geometrie laden.
  useLayoutEffect(() => {
    const el = canvas.current!
    let alive = true
    readColors()
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      size.current = { w: r.width, h: r.height }
      aimRef.current(false)
    })
    ro.observe(el)
    loadGeo().then((g) => {
      if (!alive) return
      geo.current = g
      draw(true)
    })
    return () => {
      alive = false
      ro.disconnect()
      cancelAnimationFrame(anim.current)
      clearTimeout(idle.current)
    }
  }, [draw, readColors])

  useEffect(() => {
    if (size.current.w) aim(true)
  }, [aim])

  // Neuer Lernstand, neue Markierung oder neues Theme: neu zeichnen.
  useEffect(() => {
    // Das Theme-Attribut wird vom App-Effekt nach diesem gesetzt: einen Frame warten.
    const id = requestAnimationFrame(() => {
      readColors()
      draw(true)
    })
    return () => cancelAnimationFrame(id)
  }, [levels, pool, marks, pins, theme, draw, readColors])

  // Gesten: drehen, mit zwei Fingern zoomen, Mausrad, antippen.
  useEffect(() => {
    const el = canvas.current
    if (!el || !interactive) return
    const pts = new Map<number, { x: number; y: number }>()
    let down: { x: number; y: number; time: number } | null = null
    let moved = false

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const zoom = (factor: number) => {
      const { base } = center()
      cam.current.r = Math.min(base * 45, Math.max(base * 0.42, cam.current.r * factor))
    }
    const pick = (x: number, y: number) => {
      const g = geo.current
      const { cx, cy } = center()
      const { lon, lat, r } = cam.current
      if (!g || Math.hypot(x - cx, y - cy) > r) return
      const projection = geoOrthographic().translate([cx, cy]).scale(r).rotate([lon, lat]).clipAngle(90)
      const ll = projection.invert?.([x, y])
      if (!ll) return
      const { pool, onPick } = props.current
      // Sehr kleine Länder zuerst: Sie gewinnen im Umkreis einer Fingerkuppe.
      let best: string | null = null
      let bestD = 14
      for (const c of TINY) {
        if (!pool.has(c.id) || geoDistance(c.ll, [-lon, -lat]) > Math.PI / 2) continue
        const p = projection(c.ll)
        if (!p) continue
        const d = Math.hypot(p[0] - x, p[1] - y)
        if (d < bestD) {
          bestD = d
          best = c.id
        }
      }
      if (!best) best = g.hi.shapes.find((s) => s.id && pool.has(s.id) && geoContains(s.geo, ll))?.id ?? null
      if (best) onPick?.(best)
    }

    const onDown = (e: PointerEvent) => {
      cancelAnimationFrame(anim.current)
      el.setPointerCapture(e.pointerId)
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) {
        down = { ...p, time: e.timeStamp }
        moved = false
      } else moved = true
    }
    const onMove = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId)
      if (!prev) return
      const p = local(e)
      if (pts.size === 1) {
        if (down && Math.hypot(p.x - down.x, p.y - down.y) > 8) moved = true
        if (moved) {
          const perPx = DEG / cam.current.r
          cam.current.lon += (p.x - prev.x) * perPx
          cam.current.lat = Math.max(-85, Math.min(85, cam.current.lat - (p.y - prev.y) * perPx))
        }
      } else if (pts.size === 2) {
        const other = [...pts.entries()].find(([id]) => id !== e.pointerId)![1]
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(p.x - other.x, p.y - other.y)
        if (before > 0) zoom(after / before)
      }
      pts.set(e.pointerId, p)
      if (moved) moving()
    }
    const onUp = (e: PointerEvent) => {
      const had = pts.delete(e.pointerId)
      if (!had || pts.size > 0) return
      if (!moved && down && e.timeStamp - down.time < 600 && e.type === 'pointerup') {
        const p = local(e)
        pick(p.x, p.y)
      }
      down = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnimationFrame(anim.current)
      zoom(Math.exp(-e.deltaY * 0.0022))
      moving()
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
  }, [interactive, moving])

  return <canvas ref={canvas} className={`map map--globe${interactive ? ' map--live' : ''}`} role="img" aria-label={label} />
}

export const GlobeMap = memo(GlobeMapInner)
export default GlobeMap
