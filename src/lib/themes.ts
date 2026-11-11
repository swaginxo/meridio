import type { Theme } from './types'

export interface ThemeMeta {
  id: Theme
  label: string
  text: string
  /** Seitenhintergrund, Meer und Schriftfarbe: für Browserleiste und Vorschau im Profil. */
  bg: string
  ocean: string
  ink: string
  swatch: [string, string, string]
  /** Gebirgsschattierung auf der Karte. */
  relief: boolean
}

export const THEMES: ThemeMeta[] = [
  { id: 'wald', label: 'Wald', text: 'Dunkel und ruhig', bg: '#0d241c', ocean: '#091a14', ink: '#edf5dc', swatch: ['#c8f53b', '#1e4536', '#edf5dc'], relief: false },
  { id: 'limette', label: 'Limette', text: 'Hell und frisch', bg: '#eef1de', ocean: '#153a2c', ink: '#14362a', swatch: ['#c8f53b', '#1a4333', '#fbfcf3'], relief: false },
  { id: 'bunt', label: 'Politisch', text: 'Jedes Land in eigener Farbe', bg: '#eef4fa', ocean: '#63b8f0', ink: '#1c2733', swatch: ['#f39a4f', '#8f72c2', '#6fbf7e'], relief: true },
  { id: 'atlas', label: 'Atlas', text: 'Reliefkarte mit Gebirgen', bg: '#f4efe1', ocean: '#a5d3e6', ink: '#1b3245', swatch: ['#a5d3e6', '#f3e9cb', '#ffc53d'], relief: true },
  { id: 'seekarte', label: 'Alte Seekarte', text: 'Pergament mit Relief', bg: '#efe3c8', ocean: '#d6c59d', ink: '#33241a', swatch: ['#a8362b', '#3b2a1e', '#e2ae35'], relief: true },
  { id: 'mitternacht', label: 'Mitternacht', text: 'Dunkelblau mit Türkis', bg: '#0a0f26', ocean: '#060a1b', ink: '#e8ecff', swatch: ['#7df0e2', '#1d2651', '#37427a'], relief: false },
  { id: 'sonnenuntergang', label: 'Sonnenuntergang', text: 'Warme Farben', bg: '#ffefe4', ocean: '#3c2160', ink: '#3a1f52', swatch: ['#ff8562', '#4a2a6b', '#ffb86b'], relief: false },
]

export const themeOf = (id: Theme): ThemeMeta => THEMES.find((t) => t.id === id) ?? THEMES[0]
