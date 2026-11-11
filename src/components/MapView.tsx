import { lazy, Suspense } from 'react'
import { BY_ID, VIEWS, boxAround } from '../lib/geo'
import { themeOf } from '../lib/themes'
import type { Level, Region, Settings } from '../lib/types'
import { WorldMap, type Mark } from './WorldMap'

// Der Globus bringt eigene Geometrie und Projektionscode mit: erst laden, wenn er eingeschaltet ist.
const GlobeMap = lazy(() => import('./GlobeMap'))

interface Props {
  region: Region
  /** Land, das herangeholt wird (Auflösung einer Frage). */
  focus?: string | null
  settings: Settings
  levels: Record<string, Level>
  pool: Set<string>
  marks?: Record<string, Mark>
  interactive?: boolean
  onPick?: (id: string) => void
  inset?: { top: number; bottom: number }
  label?: string
}

/** Zeigt je nach Einstellung die flache Karte oder den Globus. */
export function MapView({ region, focus = null, settings, interactive = true, ...rest }: Props) {
  // Auf der Startseite stören Punkte das Gesamtbild, dort bleiben sie aus.
  const pins = settings.pins && interactive
  if (settings.globe) {
    return (
      <Suspense fallback={<div className="map map--globe" />}>
        <GlobeMap region={region} focus={focus} pins={pins} interactive={interactive} theme={settings.theme} {...rest} />
      </Suspense>
    )
  }
  const target = focus ? BY_ID[focus] : null
  return (
    <WorldMap
      view={target ? boxAround(target) : VIEWS[region]}
      relief={themeOf(settings.theme).relief}
      pins={pins}
      interactive={interactive}
      {...rest}
    />
  )
}
