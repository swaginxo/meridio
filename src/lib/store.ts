import { useSyncExternalStore } from 'react'
import { review } from './srs'
import { FREEZE_MAX, FREEZE_PRICE, dayKey, markToday, settle } from './streak'
import type { Mode, Profile, Settings, State } from './types'

const KEY = 'meridio:v1'

const newId = () => Math.random().toString(36).slice(2, 10)

export function newProfile(name: string, settings?: Partial<Settings>): Profile {
  return {
    id: newId(),
    name,
    created: Date.now(),
    points: 0,
    answered: 0,
    correct: 0,
    streak: { count: 0, best: 0, last: null, freezes: 0, active: [], frozen: [] },
    progress: { laender: {}, hauptstaedte: {}, flaggen: {} },
    settings: {
      theme: 'wald',
      klein: true,
      abhaengig: false,
      umstritten: false,
      pins: true,
      len: 10,
      ...settings,
    },
  }
}

/** Prüft grob, ob ein importiertes Objekt ein Meridio-Profil ist, und füllt Lücken auf. */
export function normalizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<Profile>
  if (typeof p.name !== 'string' || !p.progress || typeof p.progress !== 'object') return null
  const base = newProfile(p.name.slice(0, 24) || 'Profil')
  return {
    ...base,
    created: Number(p.created) || base.created,
    points: Math.max(0, Number(p.points) || 0),
    answered: Number(p.answered) || 0,
    correct: Number(p.correct) || 0,
    streak: { ...base.streak, ...p.streak },
    progress: { ...base.progress, ...p.progress },
    settings: { ...base.settings, ...p.settings },
  }
}

function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as State | null
    if (raw && raw.v === 1 && raw.profiles[raw.activeId]) {
      for (const id of Object.keys(raw.profiles)) {
        const p = normalizeProfile(raw.profiles[id])
        if (p) raw.profiles[id] = { ...p, id }
      }
      return raw
    }
  } catch {
    // Kaputter oder gesperrter Speicher: mit frischem Gastprofil starten.
  }
  const guest = newProfile('Gast')
  return { v: 1, activeId: guest.id, profiles: { [guest.id]: guest } }
}

let state = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Speicher voll oder gesperrt: Die Sitzung läuft im Arbeitsspeicher weiter.
  }
  listeners.forEach((l) => l())
}

function patch(fn: (p: Profile) => Profile) {
  const p = state.profiles[state.activeId]
  set({ ...state, profiles: { ...state.profiles, [p.id]: fn(p) } })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useStore = () => useSyncExternalStore(subscribe, () => state)
export const useProfile = () => useStore().profiles[state.activeId]

export const actions = {
  /** Beim Start und beim Zurückkehren in die App: verpasste Tage verrechnen. */
  settleStreak() {
    const p = state.profiles[state.activeId]
    const next = settle(p.streak, dayKey())
    if (next !== p.streak) patch((q) => ({ ...q, streak: next }))
  },
  answer(mode: Mode, id: string, tries: number, points: number) {
    const now = Date.now()
    patch((p) => ({
      ...p,
      points: p.points + points,
      answered: p.answered + 1,
      correct: p.correct + (tries === 1 ? 1 : 0),
      progress: {
        ...p.progress,
        [mode]: { ...p.progress[mode], [id]: review(p.progress[mode][id], tries, now) },
      },
    }))
  },
  finishRound(bonus: number) {
    patch((p) => ({ ...p, points: p.points + bonus, streak: markToday(p.streak, dayKey()) }))
  },
  buyFreeze(): boolean {
    const p = state.profiles[state.activeId]
    if (p.points < FREEZE_PRICE || p.streak.freezes >= FREEZE_MAX) return false
    patch((q) => ({
      ...q,
      points: q.points - FREEZE_PRICE,
      streak: { ...q.streak, freezes: q.streak.freezes + 1 },
    }))
    return true
  },
  setSettings(s: Partial<Settings>) {
    patch((p) => ({ ...p, settings: { ...p.settings, ...s } }))
  },
  rename(name: string) {
    const clean = name.trim().slice(0, 24)
    if (clean) patch((p) => ({ ...p, name: clean }))
  },
  resetProgress() {
    patch((p) => ({ ...p, progress: { laender: {}, hauptstaedte: {}, flaggen: {} } }))
  },
  addProfile(name: string) {
    const cur = state.profiles[state.activeId]
    const p = newProfile(name.trim().slice(0, 24) || 'Neues Profil', { theme: cur.settings.theme })
    set({ ...state, activeId: p.id, profiles: { ...state.profiles, [p.id]: p } })
  },
  switchProfile(id: string) {
    if (state.profiles[id]) set({ ...state, activeId: id })
  },
  deleteProfile(id: string) {
    const rest = { ...state.profiles }
    delete rest[id]
    const ids = Object.keys(rest)
    if (!ids.length) return
    set({ ...state, profiles: rest, activeId: id === state.activeId ? ids[0] : state.activeId })
  },
  importProfile(raw: unknown): Profile | null {
    const p = normalizeProfile(raw)
    if (!p) return null
    set({ ...state, activeId: p.id, profiles: { ...state.profiles, [p.id]: p } })
    return p
  },
}
