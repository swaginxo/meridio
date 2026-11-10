import world from '../data/world'
import { levelOf } from './srs'
import type { Box, Country, Item, Level, Mode, Region, Settings } from './types'

export const COUNTRIES = world.countries
export const BY_ID: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]))
export const VIEWS = world.views
export const WORLD = { w: world.w, h: world.h, sphere: world.sphere, neutral: world.neutral }

const flagUrls = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})
export const flagOf = (id: string) =>
  flagUrls[`/node_modules/flag-icons/flags/4x3/${id.toLowerCase()}.svg`] ?? ''

/** Flaggen, die sich nur im Seitenverhältnis oder Farbton unterscheiden: beide Antworten zählen. */
const TWINS: string[][] = [
  ['ID', 'MC'],
  ['TD', 'RO'],
]
export function accepts(mode: Mode, target: string, picked: string): boolean {
  if (target === picked) return true
  return mode === 'flaggen' && TWINS.some((t) => t.includes(target) && t.includes(picked))
}

/** Alle Orte, die mit den aktuellen Filtern in einer Region abgefragt werden. */
export function poolFor(region: Region, s: Settings): Country[] {
  return COUNTRIES.filter((c) => {
    if (region !== 'welt' && c.cont !== region) return false
    if (c.kind === 'abhaengig') return s.abhaengig
    if (c.kind === 'umstritten') return s.umstritten
    return s.klein || !c.small
  })
}

export function levelsFor(items: Record<string, Item>, now: number): Record<string, Level> {
  const out: Record<string, Level> = {}
  for (const id in items) out[id] = levelOf(items[id], now)
  return out
}

export function tally(pool: Country[], levels: Record<string, Level>): [number, number, number, number] {
  const t: [number, number, number, number] = [0, 0, 0, 0]
  for (const c of pool) t[levels[c.id] ?? 0]++
  return t
}

/** Kartenausschnitt, der ein Land mit etwas Umgebung zeigt. */
export function boxAround(c: Country): Box {
  const [x0, y0, x1, y1] = c.box
  const pad = Math.max(60, (x1 - x0) * 0.9, (y1 - y0) * 0.9)
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]
}
