import { ArrowRight, Check, ChevronLeft, Lightbulb, RotateCcw, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WorldMap, type Mark } from '../components/WorldMap'
import { CONTINENT_NAME, easyContinent, levelPool, levelView, type EasyItem, type EasyLevel } from '../lib/easy'
import { BY_ID, COUNTRIES } from '../lib/geo'
import { actions, useProfile } from '../lib/store'
import { themeOf } from '../lib/themes'
import type { Continent } from '../lib/types'

const MAX_TRIES = 3
const NO_LEVELS = {}
const ALL = new Set(COUNTRIES.filter((c) => c.d).map((c) => c.id))

type Phase = 'ask' | 'right' | 'reveal' | 'done'

function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const draw = (level: EasyLevel) =>
  shuffle(level.items)
    .slice(0, level.size)
    .map((item) => ({ item, tip: item.tips[Math.floor(Math.random() * item.tips.length)] }))

/** Michelle-Modus: eine einfache Lernebene, mit Tipp zu jeder Frage. */
export function EasyQuiz({ level, onExit }: { level: EasyLevel; onExit: () => void }) {
  const profile = useProfile()
  const { settings } = profile
  const [queue, setQueue] = useState(() => draw(level))
  const [idx, setIdx] = useState(0)
  const [tries, setTries] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [wrong, setWrong] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [stars, setStars] = useState(0)

  const { item, tip } = queue[Math.min(idx, queue.length - 1)]
  const total = queue.length
  const pool = useMemo(() => (level.kind === 'country' ? new Set(levelPool(level)) : ALL), [level])
  const view = useMemo(() => levelView(level, item), [level, item])
  const inset = useMemo(() => ({ top: 216, bottom: 170 }), [])

  /** Was ein Tipp auf die Karte bedeutet: Kontinent, Land oder Ozean. */
  const keyOf = (id: string): string | null => {
    if (level.kind === 'continent') return BY_ID[id] ? easyContinent(BY_ID[id]) : null
    if (level.kind === 'country') return BY_ID[id] ? id : null
    return level.spots?.some((s) => s.id === id) ? id : null
  }
  const nameOf = (key: string): string => {
    if (level.kind === 'continent') return CONTINENT_NAME[key as Continent]
    if (level.kind === 'country') return BY_ID[key].name
    const ocean = level.items.find((i) => i.target === key)
    return ocean ? ocean.answer.replace(/^Das ist /, '').replace(/\.$/, '') : ''
  }
  /** Markiert alles, was zu einer Antwort gehört: bei Kontinenten jedes Land darin. */
  const markAll = (key: string, mark: Mark): Record<string, Mark> => {
    if (level.kind !== 'continent') return { [key]: mark }
    const out: Record<string, Mark> = {}
    for (const c of COUNTRIES) if (easyContinent(c) === key) out[c.id] = mark
    return out
  }
  const isRight = (target: EasyItem, key: string, id: string) =>
    key === target.target || (level.kind === 'continent' && id === 'RU' && target.target === 'europa')

  const answer = (id: string) => {
    const key = keyOf(id)
    if (!key) return
    if (isRight(item, key, id)) {
      if (tries === 0) setStars((s) => s + 1)
      actions.addPoints(tries === 0 ? 10 : 5)
      setMarks(markAll(item.target, 'right'))
      setWrong(null)
      setPhase('right')
      return
    }
    const used = tries + 1
    setTries(used)
    setWrong(nameOf(key))
    if (used >= MAX_TRIES) {
      setMarks(markAll(item.target, 'reveal'))
      setPhase('reveal')
    }
  }

  const pick = (id: string) => {
    if (phase !== 'ask' || !keyOf(id)) return
    if (settings.confirm) setSelected(id)
    else answer(id)
  }
  const confirm = () => {
    if (!selected) return
    setSelected(null)
    answer(selected)
  }
  const selectedKey = selected ? keyOf(selected) : null
  const shown = selectedKey && phase === 'ask' ? { ...marks, ...markAll(selectedKey, 'pick') } : marks

  const next = () => {
    setMarks({})
    setWrong(null)
    setSelected(null)
    setTries(0)
    if (idx + 1 >= total) {
      actions.finishRound(20)
      actions.easyStars(level.id, stars)
      setPhase('done')
    } else {
      setIdx(idx + 1)
      setPhase('ask')
    }
  }

  const restart = () => {
    setQueue(draw(level))
    setIdx(0)
    setTries(0)
    setMarks({})
    setWrong(null)
    setSelected(null)
    setStars(0)
    setPhase('ask')
  }

  if (phase === 'done') {
    return (
      <div className="summary">
        <header className="summary-head">
          <p className="summary-meta">{level.title}</p>
          <h1>{stars === total ? 'Alles richtig!' : 'Gut gemacht!'}</h1>
        </header>
        <div className="easy-stars" role="img" aria-label={`${stars} von ${total} Sternen`}>
          {Array.from({ length: total }, (_, i) => (
            <Star key={i} className={i < stars ? 'is-on' : ''} aria-hidden />
          ))}
        </div>
        <p className="easy-result">
          Du hast {stars} von {total} Fragen gleich beim ersten Mal richtig beantwortet.
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
    <div className={`quiz easy easy--${level.kind}`}>
      <WorldMap
        view={view}
        levels={NO_LEVELS}
        pool={pool}
        marks={shown}
        spots={level.spots}
        relief={themeOf(settings.theme).relief}
        onPick={pick}
        inset={inset}
        label={`Karte: ${level.title}`}
      />

      <div className="quiz-top">
        <div className="quiz-bar">
          <button className="icon-btn" onClick={onExit} aria-label="Zurück zur Übersicht">
            <ChevronLeft aria-hidden />
          </button>
          <div className="status" aria-label={level.title}>
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
            <p className="prompt-ask">{item.ask}</p>
            <p className="prompt-name">{item.name}</p>
          </div>
        </div>
        {phase === 'ask' && (
          <p className="easy-tip" key={`t-${idx}-${tries}`}>
            <Lightbulb aria-hidden />
            <span>
              {tip}
              {tries > 0 ? ` ${item.where}` : ''}
            </span>
          </p>
        )}
      </div>

      <div className="quiz-bottom" aria-live="polite">
        {phase === 'ask' && selected && (
          <button className="btn btn--primary confirm-btn" onClick={confirm}>
            <Check aria-hidden /> Auswahl bestätigen
          </button>
        )}
        {phase === 'ask' && wrong && !selected && (
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
              <span>{phase === 'right' ? `Richtig! ${item.answer}` : item.answer}</span>
            </p>
            <p className="feedback-body">{item.fact}</p>
            <button className="btn btn--primary btn--small" onClick={next} autoFocus>
              Weiter <ArrowRight aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
