import { Check, Download, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { COUNTRIES } from '../lib/geo'
import { actions, useProfile, useStore } from '../lib/store'
import { THEMES } from '../lib/themes'
import type { Settings } from '../lib/types'

const count = (fn: (c: (typeof COUNTRIES)[number]) => boolean) => COUNTRIES.filter(fn).length
const FILTERS: { key: 'klein' | 'abhaengig' | 'umstritten'; label: string; text: string; n: number }[] = [
  { key: 'klein', label: 'Kleinstaaten', text: 'Monaco, Malta, Nauru und weitere', n: count((c) => c.kind === 'staat' && c.small) },
  { key: 'abhaengig', label: 'Abhängige Gebiete', text: 'Grönland, Puerto Rico, Neukaledonien und weitere', n: count((c) => c.kind === 'abhaengig') },
  { key: 'umstritten', label: 'Umstrittene Gebiete', text: 'Kosovo, Taiwan, Westsahara', n: count((c) => c.kind === 'umstritten') },
]

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

export function ProfileScreen() {
  const state = useStore()
  const profile = useProfile()
  const { settings } = profile
  const [name, setName] = useState(profile.name)
  const [profileId, setProfileId] = useState(profile.id)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null)
  const file = useRef<HTMLInputElement>(null)

  if (profileId !== profile.id) {
    setProfileId(profile.id)
    setName(profile.name)
    setConfirm(null)
  }

  const set = (s: Partial<Settings>) => actions.setSettings(s)
  const others = Object.values(state.profiles).filter((p) => p.id !== profile.id)

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify({ app: 'meridio', v: 1, profile }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `meridio-${profile.name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setNote({ ok: true, text: 'Spielstand als Datei gesichert.' })
  }

  const importProfile = async (f: File | undefined) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text())
      const p = actions.importProfile(data?.profile ?? data)
      setNote(
        p
          ? { ok: true, text: `Spielstand von ${p.name} geladen.` }
          : { ok: false, text: 'Diese Datei ist kein Meridio-Spielstand. Wähle eine Datei, die hier gesichert wurde.' },
      )
    } catch {
      setNote({ ok: false, text: 'Die Datei kann nicht gelesen werden. Wähle eine Datei, die hier gesichert wurde.' })
    }
    if (file.current) file.current.value = ''
  }

  return (
    <div className="page">
      <h1 className="page-title">Profil</h1>

      <section className="tile group">
        <label className="field">
          <span>Name</span>
          <input
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => (name.trim() ? actions.rename(name) : setName(profile.name))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            autoComplete="off"
          />
        </label>
        {others.length > 0 && (
          <ul className="profiles" aria-label="Andere Profile auf diesem Gerät">
            {others.map((p) => (
              <li key={p.id}>
                <button onClick={() => actions.switchProfile(p.id)}>
                  <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                  <span>{p.name}</span>
                  <small>Wechseln</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn--ghost" onClick={() => actions.addProfile(`Profil ${others.length + 2}`)}>
          <Plus aria-hidden /> Weiteres Profil anlegen
        </button>
      </section>

      <h2 className="group-title">Darstellung</h2>
      <div className="themes" role="radiogroup" aria-label="Farbschema">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={settings.theme === t.id}
            className="theme"
            style={{ '--t-bg': t.bg, '--t-ink': t.ink } as CSSProperties}
            onClick={() => set({ theme: t.id })}
          >
            <span className="theme-swatch" aria-hidden>
              {t.swatch.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="theme-name">{t.label}</span>
            <span className="theme-text">{t.text}</span>
            {settings.theme === t.id && <Check className="theme-check" aria-hidden />}
          </button>
        ))}
      </div>

      <section className="tile group">
        <div className="row">
          <div>
            <p className="row-label">Michelle-Modus</p>
          </div>
          <Switch on={settings.michelle} onChange={(v) => set({ michelle: v })} label="Michelle-Modus" />
        </div>
        <div className="row">
          <div>
            <p className="row-label">3D-Weltkarte</p>
            <p className="row-text">Zeigt die Erde als drehbaren Globus im All. Gebirgsrelief gibt es nur auf der flachen Karte.</p>
          </div>
          <Switch on={settings.globe} onChange={(v) => set({ globe: v })} label="3D-Weltkarte" />
        </div>
      </section>

      <h2 className="group-title">Ortsfilter</h2>
      <section className="tile group">
        {FILTERS.map((f) => (
          <div className="row" key={f.key}>
            <div>
              <p className="row-label">
                {f.label} <span className="row-count">{f.n}</span>
              </p>
              <p className="row-text">{f.text}</p>
            </div>
            <Switch on={settings[f.key]} onChange={(v) => set({ [f.key]: v })} label={f.label} />
          </div>
        ))}
        <div className="row">
          <div>
            <p className="row-label">Lernstand im Spiel</p>
            <p className="row-text">Färbt Länder während einer Runde nach Lernstufe. Aus: neutrale Karte ohne Hinweise</p>
          </div>
          <Switch on={settings.showLevels} onChange={(v) => set({ showLevels: v })} label="Lernstand im Spiel" />
        </div>
        <div className="row">
          <div>
            <p className="row-label">Punkte für kleine Länder</p>
            <p className="row-text">Markiert Inselstaaten und Kleinstaaten, bis sie beim Zoomen groß genug sind</p>
          </div>
          <Switch on={settings.pins} onChange={(v) => set({ pins: v })} label="Punkte für kleine Länder" />
        </div>
        <div className="row">
          <div>
            <p className="row-label">Rundenlänge</p>
            <p className="row-text">Fragen pro Runde</p>
          </div>
          <div className="seg seg--small" role="radiogroup" aria-label="Rundenlänge">
            {([10, 20] as const).map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={settings.len === n}
                className={settings.len === n ? 'is-on' : ''}
                onClick={() => set({ len: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <h2 className="group-title">Spielstand</h2>
      <section className="tile group">
        <p className="row-text">
          Der Spielstand wird nur in diesem Browser gespeichert. Sichere ihn als Datei, um ihn auf ein anderes
          Gerät zu übertragen oder nach dem Löschen der Browserdaten wiederherzustellen.
        </p>
        <div className="pair">
          <button className="btn btn--deep" onClick={exportProfile}>
            <Download aria-hidden /> Sichern
          </button>
          <button className="btn btn--deep" onClick={() => file.current?.click()}>
            <Upload aria-hidden /> Laden
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => importProfile(e.target.files?.[0])}
          />
        </div>
        {note && (
          <p className={`note${note.ok ? '' : ' note--bad'}`} role="status">
            {note.text}
          </p>
        )}

        {confirm === 'reset' ? (
          <div className="confirm">
            <p>Lernfortschritt für alle Modi löschen? Punkte und Streak bleiben.</p>
            <div className="pair">
              <button
                className="btn btn--danger"
                onClick={() => {
                  actions.resetProgress()
                  setConfirm(null)
                  setNote({ ok: true, text: 'Lernfortschritt zurückgesetzt.' })
                }}
              >
                Ja, löschen
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : confirm === 'delete' ? (
          <div className="confirm">
            <p>Profil „{profile.name}“ mit Punkten, Streak und Fortschritt endgültig löschen?</p>
            <div className="pair">
              <button className="btn btn--danger" onClick={() => actions.deleteProfile(profile.id)}>
                Ja, löschen
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="quiet-actions">
            <button onClick={() => setConfirm('reset')}>Lernfortschritt zurücksetzen</button>
            {others.length > 0 && (
              <button onClick={() => setConfirm('delete')}>
                <Trash2 aria-hidden /> Profil löschen
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
