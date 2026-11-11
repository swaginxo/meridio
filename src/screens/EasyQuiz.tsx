import { ArrowRight, Check, ChevronLeft, Lightbulb, RotateCcw, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WorldMap, type Mark } from '../components/WorldMap'
import { EASY, easyAccepts, easyContinent, type EasyContinent } from '../lib/easy'
import { BY_ID, COUNTRIES, VIEWS } from '../lib/geo'
import { actions, useProfile } from '../lib/store'
import { themeOf } from '../lib/themes'

const MAX_TRIES = 3
const NO_LEVELS = {}
const ALL = new Set(COUNTRIES.filter((c) => c.d).map((c) => c.id))
const INSET = { top: 216, bottom: 150 }

type Phase = 'ask' | 'right' | 'reveal' | 'done'

function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const draw = () => shuffle(EASY).map((c) => ({ c, tip: c.tips[Math.floor(Math.random() * c.tips.length)] }))

/** Alle Länder eines Kontinents auf einmal markieren. */
function markContinent(target: EasyContinent, mark: Mark): Record<string, Mark> {
  const out: Record<string, Mark> = {}
  for (const c of COUNTRIES) if (easyContinent(c) === target.id) out[c.id] = mark
  return out
}

/** Michelle-Modus: Kontinente antippen, mit Tipp zu jeder Frage. */
export function EasyQuiz({ onExit }: { onExit: () => void }) {
  const profile = useProfile()
  const [queue, setQueue] = useState(draw)
  const [idx, setIdx] = useState(0)
  const [tries, setTries] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [wrong, setWrong] = useState<string | null>(null)
  const [stars, setStars] = useState(0)

  const { c: target, tip } = queue[Math.min(idx, queue.length - 1)]
  const total = queue.length
  const relief = useMemo(() => themeOf(profile.settings.theme).relief, [profile.settings.theme])

  const pick = (id: string) => {
    if (phase !== 'ask') return
    const country = BY_ID[id]
    if (easyAccepts(target.id, country)) {
      if (tries === 0) setStars((s) => s + 1)
      actions.addPoints(tries === 0 ? 10 : 5)
      setMarks(markContinent(target, 'right'))
      setWrong(null)
      setPhase('right')
      return
    }
    const used = tries + 1
    setTries(used)
    setWrong(EASY.find((e) => e.id === easyContinent(country))!.name)
    if (used >= MAX_TRIES) {
      setMarks(markContinent(target, 'reveal'))
      setPhase('reveal')
    }
  }

  const next = () => {
    setMarks({})
    setWrong(null)
    setTries(0)
    if (idx + 1 >= total) {
      actions.finishRound(20)
      setPhase('done')
    } else {
      setIdx(idx + 1)
      setPhase('ask')
    }
  }

  const restart = () => {
    setQueue(draw())
    setIdx(0)
    setTries(0)
    setMarks({})
    setWrong(null)
    setStars(0)
    setPhase('ask')
  }

  if (phase === 'done') {
    return (
      <div className="summary">
        <header className="summary-head">
          <p className="summary-meta">Kontinente</p>
          <h1>{stars === total ? 'Alles richtig!' : 'Gut gemacht!'}</h1>
        </header>
        <div className="easy-stars" role="img" aria-label={`${stars} von ${total} Sternen`}>
          {Array.from({ length: total }, (_, i) => (
            <Star key={i} className={i < stars ? 'is-on' : ''} aria-hidden />
          ))}
        </div>
        <p className="easy-result">
          Du hast {stars} von {total} Kontinenten gleich beim ersten Mal gefunden.
        </p>
        <div className="summary-actions">
          <button className="btn btn--primary" onClick={restart}>
            <RotateCcw aria-hidden /> Noch einmal
          </button>
          <button className="btn btn--ghost" onClick={onExit}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz easy">
      <WorldMap
        view={VIEWS.welt}
        levels={NO_LEVELS}
        pool={ALL}
        marks={marks}
        relief={relief}
        onPick={pick}
        inset={INSET}
        label="Weltkarte mit farbigen Kontinenten"
      />

      <div className="quiz-top">
        <div className="quiz-bar">
          <button className="icon-btn" onClick={onExit} aria-label="Zurück zur Übersicht">
            <ChevronLeft aria-hidden />
          </button>
          <div className="status" aria-label="Kontinente">
            <div className="status-item">
              <span className="status-num">
                <small>Frage</small> {Math.min(idx + 1, total)}/{total}
              </span>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={idx}>
                <span style={{ width: `${((idx + (phase === 'ask' ? 0 : 1)) / total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="prompt" key={idx}>
          <div>
            <p className="prompt-ask">Tippe auf</p>
            <p className="prompt-name">{target.name}</p>
          </div>
        </div>
        {phase === 'ask' && (
          <p className="easy-tip" key={`t-${idx}-${tries}`}>
            <Lightbulb aria-hidden />
            <span>
              {tip}
              {tries > 0 ? ` ${target.where}` : ''}
            </span>
          </p>
        )}
      </div>

      <div className="quiz-bottom" aria-live="polite">
        {phase === 'ask' && wrong && (
          <div className="feedback feedback--wrong" key={`w-${tries}`}>
            <p className="feedback-head">
              <X aria-hidden />
              <span>Das ist {wrong}. Versuch es noch einmal.</span>
            </p>
          </div>
        )}
        {(phase === 'right' || phase === 'reveal') && (
          <div className={`feedback feedback--${phase}`}>
            <p className="feedback-head">
              {phase === 'right' && <Check aria-hidden />}
              <span>{phase === 'right' ? `Richtig! Das ist ${target.name}.` : `Hier ist ${target.name}.`}</span>
            </p>
            <p className="feedback-body">{target.fact}</p>
            <button className="btn btn--primary btn--small" onClick={next} autoFocus>
              Weiter <ArrowRight aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
