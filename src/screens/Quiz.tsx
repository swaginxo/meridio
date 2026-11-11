import { ArrowRight, Check, Flame, Lightbulb, RotateCcw, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { MapView } from '../components/MapView'
import type { Mark } from '../components/WorldMap'
import { BY_ID, accepts, flagOf, levelsFor, poolFor, tally } from '../lib/geo'
import { drawRound } from '../lib/srs'
import { actions, useProfile } from '../lib/store'
import { factFor, tipFor } from '../lib/tips'
import { Meter } from './Home'
import { MODES, REGIONS, type Mode, type Region } from '../lib/types'

const POINTS = [0, 10, 6, 3]
const MAX_TRIES = 3

type Phase = 'ask' | 'right' | 'reveal' | 'done'
interface Result {
  id: string
  tries: number
}

export function Quiz({ mode, region, onExit }: { mode: Mode; region: Region; onExit: () => void }) {
  const profile = useProfile()
  const { settings } = profile
  const pool = useMemo(() => poolFor(region, settings), [region, settings])
  const poolIds = useMemo(() => new Set(pool.map((c) => c.id)), [pool])

  const draw = () => drawRound(pool.map((c) => c.id), profile.progress[mode], settings.len, Date.now())
  const [round, setRound] = useState(0)
  // Die Runde wird einmal gezogen und bleibt stehen, auch wenn sich der Lernstand ändert.
  const [base, setBase] = useState(draw)
  const total = base.length
  const [queue, setQueue] = useState<string[]>(base)
  const [idx, setIdx] = useState(0)
  const [tries, setTries] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [lastWrong, setLastWrong] = useState<string | null>(null)
  const [gained, setGained] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [streakBefore] = useState(profile.streak.count)
  const repeated = useRef(new Set<string>())
  // Als Ref, weil der Übergang zur nächsten Frage zeitversetzt läuft.
  const resultsRef = useRef<Result[]>([])
  const addResult = (r: Result) => {
    resultsRef.current = [...resultsRef.current, r]
    setResults(resultsRef.current)
  }

  const targetId = queue[idx]
  const target = BY_ID[targetId]
  const levels = useMemo(() => levelsFor(profile.progress[mode], Date.now()), [profile.progress, mode])

  const next = useCallback(() => {
    setMarks({})
    setLastWrong(null)
    setTries(0)
    if (idx + 1 >= queue.length) {
      const firstTry = resultsRef.current.filter((r) => r.tries === 1).length
      const bonus = 20 + (firstTry === total ? 30 : 0)
      actions.finishRound(bonus)
      setGained((g) => g + bonus)
      setPhase('done')
    } else {
      setIdx(idx + 1)
      setPhase('ask')
    }
  }, [idx, queue.length, total])

  const pick = useCallback(
    (id: string) => {
      if (phase !== 'ask' || !target) return
      const isRepeat = idx >= total
      if (accepts(mode, targetId, id)) {
        const used = tries + 1
        const pts = isRepeat ? 0 : POINTS[used]
        if (!isRepeat) {
          actions.answer(mode, targetId, used, pts)
          addResult({ id: targetId, tries: used })
          setGained((g) => g + pts)
        }
        setMarks({ [targetId]: 'right' })
        setLastWrong(null)
        setPhase('right')
        return
      }
      const used = tries + 1
      setTries(used)
      setLastWrong(id)
      if (used >= MAX_TRIES) {
        if (!isRepeat) {
          actions.answer(mode, targetId, 0, 0)
          addResult({ id: targetId, tries: 0 })
          // Nicht gewusste Orte kommen am Ende der Runde noch einmal.
          if (!repeated.current.has(targetId)) {
            repeated.current.add(targetId)
            setQueue((q) => [...q, targetId])
          }
        }
        setMarks({ [id]: 'wrong', [targetId]: 'reveal' })
        setPhase('reveal')
      } else {
        setMarks((m) => ({ ...m, [id]: 'wrong' }))
      }
    },
    [phase, target, targetId, tries, mode, idx, total],
  )

  const restart = () => {
    repeated.current.clear()
    const ids = draw()
    setRound(round + 1)
    setBase(ids)
    setQueue(ids)
    setIdx(0)
    setTries(0)
    setMarks({})
    setLastWrong(null)
    setGained(0)
    resultsRef.current = []
    setResults([])
    setPhase('ask')
  }

  const inset = useMemo(() => ({ top: 196, bottom: 150 }), [])
  const regionLabel = REGIONS.find((r) => r.id === region)!.label
  const modeLabel = MODES.find((m) => m.id === mode)!.label

  if (phase === 'done') {
    const firstTry = results.filter((r) => r.tries === 1).length
    const missed = results.filter((r) => r.tries !== 1)
    const streakNow = profile.streak.count
    return (
      <div className="summary">
        <header className="summary-head">
          <p className="summary-meta">
            {modeLabel} · {regionLabel}
          </p>
          <h1>{firstTry === total ? 'Fehlerfrei' : firstTry >= total * 0.7 ? 'Sehr gute Runde' : 'Runde abgeschlossen'}</h1>
        </header>

        <div className="summary-grid">
          <div className="tile tile--lime stat">
            <span className="stat-num">
              {firstTry}
              <small>/{total}</small>
            </span>
            <span className="stat-label">im ersten Versuch</span>
          </div>
          <div className="tile stat">
            <span className="stat-num">+{gained}</span>
            <span className="stat-label">Punkte</span>
          </div>
          <div className={`tile stat stat--wide${streakNow > streakBefore ? ' is-new' : ''}`}>
            <Flame className="stat-flame" aria-hidden />
            <div>
              <span className="stat-num">
                {streakNow} {streakNow === 1 ? 'Tag' : 'Tage'}
              </span>
              <span className="stat-label">
                {streakNow > streakBefore ? 'Streak verlängert' : 'Heutiges Ziel bereits erreicht'}
              </span>
            </div>
          </div>
        </div>

        {missed.length > 0 && (
          <section className="missed">
            <h2>Zur Wiederholung</h2>
            <ul>
              {missed.map((r) => {
                const c = BY_ID[r.id]
                return (
                  <li key={r.id}>
                    <img src={flagOf(c.id)} alt="" />
                    <span className="missed-name">{c.name}</span>
                    <span className="missed-cap">{c.capital}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <div className="summary-actions">
          <button className="btn btn--primary" onClick={restart}>
            <RotateCcw aria-hidden /> Nächste Runde
          </button>
          <button className="btn btn--ghost" onClick={onExit}>
            Beenden
          </button>
        </div>
      </div>
    )
  }

  if (!target) {
    return (
      <div className="summary">
        <header className="summary-head">
          <h1>Keine Orte verfügbar</h1>
          <p className="summary-meta">Mit den aktuellen Ortsfiltern enthält {regionLabel} keine Orte.</p>
        </header>
        <div className="summary-actions">
          <button className="btn btn--primary" onClick={onExit}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  const left = MAX_TRIES - tries
  const wrong = lastWrong ? BY_ID[lastWrong] : null
  const done = Math.min(idx + (phase === 'ask' ? 0 : 1), total)
  const counts = tally(pool, levels)
  const fact = factFor(target)

  return (
    <div className="quiz">
      <MapView
        region={region}
        focus={phase === 'reveal' ? targetId : null}
        settings={settings}
        levels={levels}
        pool={poolIds}
        marks={marks}
        onPick={pick}
        inset={inset}
        label={`Karte: ${regionLabel}`}
      />

      <div className="quiz-top">
        <div className="quiz-bar">
          <button className="icon-btn" onClick={onExit} aria-label="Runde beenden">
            <X aria-hidden />
          </button>
          <div className="status">
            <div className="status-row">
              <span>
                {modeLabel} · {regionLabel}
              </span>
              <strong>
                {done}/{total}
              </strong>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label="Fortschritt in dieser Runde"
            >
              <span style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <div className="status-row">
              <span>Lernstand</span>
              <strong>
                {counts[2] + counts[3]}/{pool.length}
              </strong>
            </div>
            <Meter counts={counts} />
          </div>
        </div>

        <div className="prompt" key={`${round}-${idx}`}>
          {mode === 'flaggen' ? (
            <>
              <img className="prompt-flag" src={flagOf(targetId)} alt="Gesuchte Flagge" />
              <div>
                <p className="prompt-ask">Welches Land führt diese Flagge?</p>
                {phase !== 'ask' && <p className="prompt-name">{target.name}</p>}
              </div>
            </>
          ) : (
            <div>
              <p className="prompt-ask">
                {mode === 'laender' ? 'Wähle auf der Karte' : 'Welches Land hat die Hauptstadt'}
                {idx >= total ? ' · Wiederholung' : ''}
              </p>
              <p className="prompt-name">{mode === 'laender' ? target.name : target.capital}</p>
            </div>
          )}
        </div>
      </div>

      <div className="quiz-bottom" aria-live="polite">
        {phase === 'ask' && wrong && (
          <div className="feedback feedback--wrong" key={`w-${tries}`}>
            <p className="feedback-head">
              <X aria-hidden />
              <span>
                Das ist {wrong.name}. Noch {left} {left === 1 ? 'Versuch' : 'Versuche'}.
              </span>
            </p>
            <p className="feedback-body">
              <Lightbulb aria-hidden />
              <span>{tipFor(mode, target)}</span>
            </p>
          </div>
        )}
        {(phase === 'right' || phase === 'reveal') && (
          <div className={`feedback feedback--${phase}`}>
            <p className="feedback-head">
              {phase === 'right' && <Check aria-hidden />}
              <span>
                {phase === 'right'
                  ? mode === 'laender'
                    ? 'Richtig'
                    : `Richtig: ${target.name}`
                  : mode === 'laender'
                    ? `Hier liegt ${target.name}.`
                    : mode === 'hauptstaedte'
                      ? `${target.capital} ist die Hauptstadt von ${target.name}.`
                      : `Die Flagge gehört zu ${target.name}.`}
              </span>
            </p>
            {fact && <p className="feedback-body">{fact}</p>}
            <button className="btn btn--primary btn--small" onClick={next} autoFocus>
              Weiter <ArrowRight aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
