import { ArrowUpRight, Flame, Sparkles, Star } from 'lucide-react'
import { useMemo } from 'react'
import { MapView } from '../components/MapView'
import { EASY_LEVELS } from '../lib/easy'
import { COUNTRIES, levelsFor, poolFor, tally } from '../lib/geo'
import { useProfile } from '../lib/store'
import { MODES, REGIONS, type Mode, type Region } from '../lib/types'

const EMPTY = {}
const ALL_IDS = new Set(COUNTRIES.filter((c) => c.d).map((c) => c.id))

const HINT: Record<Mode, string> = {
  laender: 'Du erhältst einen Ländernamen und wählst das Land auf der Karte.',
  hauptstaedte: 'Du erhältst eine Hauptstadt und wählst das zugehörige Land auf der Karte.',
  flaggen: 'Du siehst eine Flagge und wählst das zugehörige Land auf der Karte.',
}

export function Meter({ counts }: { counts: [number, number, number, number] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  return (
    <div className="meter" aria-hidden>
      {[3, 2, 1, 0].map((lv) =>
        counts[lv] ? <span key={lv} className={`meter-seg lv${lv}`} style={{ flexGrow: counts[lv] / total }} /> : null,
      )}
    </div>
  )
}

export function Home({
  mode,
  onMode,
  onStart,
  onEasy,
  onStreak,
}: {
  mode: Mode
  onMode: (m: Mode) => void
  onStart: (r: Region) => void
  onEasy: (level: string) => void
  onStreak: () => void
}) {
  const profile = useProfile()
  const { settings, streak } = profile
  const levels = useMemo(() => levelsFor(profile.progress[mode], Date.now()), [profile.progress, mode])
  const world = useMemo(() => poolFor('welt', settings), [settings])
  const worldIds = useMemo(() => new Set(world.map((c) => c.id)), [world])
  const worldTally = tally(world, levels)
  const learned = worldTally[2] + worldTally[3]

  if (settings.michelle) {
    return (
      <div className="home">
        <header className="top">
          <div className="brand">
            <svg viewBox="0 0 32 32" aria-hidden>
              <circle cx="16" cy="16" r="13" />
              <path d="M16 3c-6 4-6 22 0 26M16 3c6 4 6 22 0 26M4 12h24M4 20h24" />
            </svg>
            <span>meridio</span>
          </div>
          <button className="chip" onClick={onStreak} aria-label={`Streak: ${streak.count} Tage`}>
            <Flame aria-hidden /> {streak.count}
          </button>
        </header>
        <section className="hero easy--continent">
          <div className="hero-map">
            <MapView
              region="welt"
              settings={{ ...settings, globe: false }}
              levels={EMPTY}
              pool={ALL_IDS}
              interactive={false}
              label="Weltkarte mit farbigen Kontinenten"
            />
          </div>
        </section>
        <section className="regions easy-levels" aria-label="Lernebene wählen">
          {EASY_LEVELS.map((level, i) => {
            const best = profile.easy[level.id]
            return (
              <button
                key={level.id}
                className={`region${i === 0 ? ' region--world' : ''}`}
                onClick={() => onEasy(level.id)}
              >
                <span className="region-name">{level.title}</span>
                <span className="region-count">{level.text}</span>
                <ArrowUpRight className="region-go" aria-hidden />
                <span className="easy-best">
                  <Star aria-hidden /> {best == null ? 'Noch nicht gespielt' : `${best} von ${level.size}`}
                </span>
              </button>
            )
          })}
        </section>
        <p className="hint">Der Michelle-Modus ist an. Im Profil kannst du ihn wieder ausschalten.</p>
      </div>
    )
  }

  return (
    <div className="home">
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden>
            <circle cx="16" cy="16" r="13" />
            <path d="M16 3c-6 4-6 22 0 26M16 3c6 4 6 22 0 26M4 12h24M4 20h24" />
          </svg>
          <span>meridio</span>
        </div>
        <button className="chip" onClick={onStreak} aria-label={`Streak: ${streak.count} Tage`}>
          <Flame aria-hidden /> {streak.count}
        </button>
        <button className="chip chip--quiet" onClick={onStreak} aria-label={`${profile.points} Punkte`}>
          <Sparkles aria-hidden /> {profile.points}
        </button>
      </header>

      <section className={`hero${settings.globe ? ' hero--globe' : ''}`}>
        <button className="hero-map" onClick={() => onStart('welt')} aria-label="Runde mit der ganzen Welt starten">
          <MapView
            region="welt"
            settings={settings}
            levels={levels}
            pool={worldIds}
            interactive={false}
            label="Dein Lernstand auf der Weltkarte"
          />
        </button>
        <div className="hero-foot">
          <div>
            <p className="hero-num">
              {learned}
              <small> von {world.length}</small>
            </p>
            <p className="hero-label">{MODES.find((m) => m.id === mode)!.label} gelernt</p>
          </div>
          <ul className="legend" aria-label="Farben auf der Karte">
            <li><i className="lv0" />Neu</li>
            <li><i className="lv1" />Unsicher</li>
            <li><i className="lv2" />Gefestigt</li>
            <li><i className="lv3" />Beherrscht</li>
          </ul>
        </div>
      </section>

      <div className="seg" role="tablist" aria-label="Lernmodus">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={mode === m.id ? 'is-on' : ''}
            onClick={() => onMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="hint">{HINT[mode]}</p>

      <section className="regions" aria-label="Region wählen">
        {REGIONS.map((r) => {
          const pool = r.id === 'welt' ? world : poolFor(r.id, settings)
          const t = r.id === 'welt' ? worldTally : tally(pool, levels)
          const sure = t[2] + t[3]
          return (
            <button
              key={r.id}
              className={`region${r.id === 'welt' ? ' region--world' : ''}`}
              onClick={() => onStart(r.id)}
              disabled={pool.length === 0}
            >
              <span className="region-name">{r.label}</span>
              <span className="region-count">
                {sure} von {pool.length}
              </span>
              <ArrowUpRight className="region-go" aria-hidden />
              <Meter counts={t} />
            </button>
          )
        })}
      </section>
    </div>
  )
}
