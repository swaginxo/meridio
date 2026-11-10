import type { Item, Level } from './types'

const DAY = 86_400_000
/** Wie lange eine Stufe hält, bevor sie verblasst (in Tagen). */
const HOLD: Record<Level, number> = { 0: 0, 1: 2, 2: 8, 3: 28 }

/** Sichtbare Stufe: gespeicherte Stufe minus das, was seit der letzten Abfrage verblasst ist. */
export function levelOf(item: Item | undefined, now: number): Level {
  if (!item || item.b === 0) return 0
  let level: Level = item.b
  let rest = now - item.t
  // Jede Stufe hält ihre eigene Zeit, darunter bleibt Gelb als "schon gesehen" stehen.
  while (level > 1 && rest > HOLD[level] * DAY) {
    rest -= HOLD[level] * DAY
    level = (level - 1) as Level
  }
  return level
}

/** tries: 1 = sofort richtig, 2 oder 3 = mit Fehlversuchen, 0 = nicht gewusst. */
export function review(item: Item | undefined, tries: number, now: number): Item {
  const cur = levelOf(item, now)
  let b: Level
  if (tries === 1) b = Math.min(3, cur + 1) as Level
  else if (tries > 1) b = Math.max(1, cur - 1) as Level
  else b = cur >= 2 ? ((cur - 1) as Level) : 0
  return { b, t: now, n: (item?.n ?? 0) + 1 }
}

const WEIGHT: Record<Level, number> = { 0: 3, 1: 4.5, 2: 2, 3: 0.5 }

/** Zieht eine Runde: schwache und verblasste Orte kommen häufiger dran. */
export function drawRound(
  ids: string[],
  items: Record<string, Item>,
  size: number,
  now: number,
  rand: () => number = Math.random,
): string[] {
  const pool = ids.map((id) => {
    const it = items[id]
    const faded = it && levelOf(it, now) < it.b ? 1.5 : 1
    return { id, w: WEIGHT[levelOf(it, now)] * faded }
  })
  const out: string[] = []
  while (out.length < size && pool.length) {
    let r = rand() * pool.reduce((s, p) => s + p.w, 0)
    let i = 0
    while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++
    out.push(pool[i].id)
    pool.splice(i, 1)
  }
  return out
}
