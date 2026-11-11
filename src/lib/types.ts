export type Mode = 'laender' | 'hauptstaedte' | 'flaggen'
export type Continent = 'europa' | 'asien' | 'afrika' | 'nordamerika' | 'suedamerika' | 'ozeanien'
export type Region = 'welt' | Continent
export type Level = 0 | 1 | 2 | 3
export type Theme = 'wald' | 'limette' | 'atlas' | 'seekarte' | 'mitternacht' | 'sonnenuntergang'
export type Box = [number, number, number, number]

export interface Country {
  id: string
  name: string
  capital: string
  cont: Continent
  kind: 'staat' | 'abhaengig' | 'umstritten'
  small: boolean
  pin: boolean
  c: [number, number]
  box: Box
  d: string
}

/** Lernstand eines Ortes: Stufe, Zeitpunkt der letzten Abfrage, Anzahl Abfragen. */
export interface Item {
  b: Level
  t: number
  n: number
}

export interface Settings {
  theme: Theme
  klein: boolean
  abhaengig: boolean
  umstritten: boolean
  pins: boolean
  len: 10 | 20
}

export interface Streak {
  count: number
  best: number
  last: string | null
  freezes: number
  /** Tage, an denen gelernt wurde (JJJJ-MM-TT). */
  active: string[]
  /** Tage, die ein Streak Freeze gerettet hat. */
  frozen: string[]
}

export interface Profile {
  id: string
  name: string
  created: number
  points: number
  answered: number
  correct: number
  streak: Streak
  progress: Record<Mode, Record<string, Item>>
  settings: Settings
}

export interface State {
  v: 1
  activeId: string
  profiles: Record<string, Profile>
}

export const MODES: { id: Mode; label: string }[] = [
  { id: 'laender', label: 'Länder' },
  { id: 'hauptstaedte', label: 'Hauptstädte' },
  { id: 'flaggen', label: 'Flaggen' },
]

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'welt', label: 'Ganze Welt' },
  { id: 'europa', label: 'Europa' },
  { id: 'asien', label: 'Asien' },
  { id: 'afrika', label: 'Afrika' },
  { id: 'nordamerika', label: 'Nordamerika' },
  { id: 'suedamerika', label: 'Südamerika' },
  { id: 'ozeanien', label: 'Ozeanien' },
]
