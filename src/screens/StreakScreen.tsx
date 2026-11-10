import { Check, Flame, Snowflake, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { actions, useProfile } from '../lib/store'
import { FREEZE_MAX, FREEZE_PRICE, addDays, dayKey } from '../lib/streak'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function StreakScreen() {
  const profile = useProfile()
  const { streak, points } = profile
  const today = dayKey()
  const [bought, setBought] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6)
    const [y, m, d] = key.split('-').map(Number)
    const state = streak.active.includes(key) ? 'done' : streak.frozen.includes(key) ? 'frozen' : key === today ? 'today' : 'open'
    return { key, label: WEEKDAYS[new Date(y, m - 1, d).getDay()], state }
  })

  const doneToday = streak.last === today
  const full = streak.freezes >= FREEZE_MAX
  const short = FREEZE_PRICE - points
  const accuracy = profile.answered ? Math.round((profile.correct / profile.answered) * 100) : null

  return (
    <div className="page">
      <h1 className="page-title">Streak</h1>

      <section className="tile tile--lime streak-hero">
        <Flame className="streak-flame" aria-hidden />
        <p className="streak-num">{streak.count}</p>
        <p className="streak-unit">{streak.count === 1 ? 'Tag in Folge' : 'Tage in Folge'}</p>
        <p className="streak-note">
          {doneToday
            ? 'Heute ist erledigt. Morgen geht es weiter.'
            : streak.count > 0
              ? 'Spiel heute eine Runde, damit dein Streak weiterläuft.'
              : 'Eine abgeschlossene Runde startet deinen Streak.'}
        </p>
      </section>

      <ol className="week" aria-label="Die letzten sieben Tage">
        {days.map((d) => (
          <li key={d.key} className={`day day--${d.state}`}>
            <span className="day-dot">
              {d.state === 'done' && <Check aria-label="gelernt" />}
              {d.state === 'frozen' && <Snowflake aria-label="Streak Freeze eingesetzt" />}
            </span>
            <span className="day-label">{d.label}</span>
          </li>
        ))}
      </ol>

      <section className="tile freeze">
        <div className="freeze-head">
          <h2>Streak Freeze</h2>
          <div className="freeze-slots" aria-label={`${streak.freezes} von ${FREEZE_MAX} vorrätig`}>
            {Array.from({ length: FREEZE_MAX }, (_, i) => (
              <span key={i} className={i < streak.freezes ? 'is-full' : ''}>
                <Snowflake aria-hidden />
              </span>
            ))}
          </div>
        </div>
        <p className="freeze-text">
          Vergisst du einen Tag, wird automatisch ein Freeze eingesetzt und dein Streak bleibt stehen. Du kannst bis
          zu {FREEZE_MAX} auf Vorrat halten.
        </p>
        <button
          className="btn btn--primary"
          disabled={full || short > 0}
          onClick={() => {
            if (actions.buyFreeze()) setBought(true)
          }}
        >
          <Snowflake aria-hidden /> Für {FREEZE_PRICE} Punkte kaufen
        </button>
        <p className="freeze-state" aria-live="polite">
          {full
            ? 'Dein Vorrat ist voll.'
            : short > 0
              ? `Dir fehlen noch ${short} Punkte.`
              : bought
                ? 'Gekauft. Der Freeze liegt bereit.'
                : `Du hast ${points} Punkte.`}
        </p>
      </section>

      <dl className="facts">
        <div>
          <dt><Sparkles aria-hidden /> Punkte</dt>
          <dd>{points}</dd>
        </div>
        <div>
          <dt>Längster Streak</dt>
          <dd>{streak.best}</dd>
        </div>
        <div>
          <dt>Sofort richtig</dt>
          <dd>{accuracy === null ? 'noch offen' : `${accuracy} %`}</dd>
        </div>
      </dl>
    </div>
  )
}
