import type { Streak } from './types'

export const FREEZE_PRICE = 150
export const FREEZE_MAX = 2

export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(key: string, n: number): string {
  const d = parse(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)
}

const keep = (list: string[]) => list.slice(-90)

/**
 * Gleicht verpasste Tage aus: Streak Freezes werden automatisch eingesetzt,
 * reichen sie nicht, fällt der Streak auf 0.
 */
export function settle(s: Streak, today: string): Streak {
  if (!s.last || s.count === 0) return s
  const missed = daysBetween(s.last, today) - 1
  if (missed <= 0) return s
  if (missed > s.freezes) return { ...s, count: 0 }
  const frozen = [...s.frozen]
  for (let i = 1; i <= missed; i++) frozen.push(addDays(s.last, i))
  return { ...s, freezes: s.freezes - missed, frozen: keep(frozen), last: addDays(today, -1) }
}

/** Zählt den heutigen Tag, sobald eine Runde abgeschlossen ist. */
export function markToday(s: Streak, today: string): Streak {
  const cur = settle(s, today)
  if (cur.last === today) return cur
  const count = cur.count + 1
  return {
    ...cur,
    count,
    best: Math.max(cur.best, count),
    last: today,
    active: keep([...cur.active, today]),
  }
}
