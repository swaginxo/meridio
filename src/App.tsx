import { Flame, Globe2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { levelById } from './lib/easy'
import { actions, useProfile } from './lib/store'
import { themeOf } from './lib/themes'
import type { Mode, Region } from './lib/types'
import { EasyQuiz } from './screens/EasyQuiz'
import { Home } from './screens/Home'
import { ProfileScreen } from './screens/ProfileScreen'
import { Quiz } from './screens/Quiz'
import { StreakScreen } from './screens/StreakScreen'

type Tab = 'lernen' | 'streak' | 'profil'

const TABS = [
  { id: 'lernen', label: 'Lernen', Icon: Globe2 },
  { id: 'streak', label: 'Streak', Icon: Flame },
  { id: 'profil', label: 'Profil', Icon: UserRound },
] as const


export default function App() {
  const profile = useProfile()
  const [tab, setTab] = useState<Tab>('lernen')
  const [mode, setMode] = useState<Mode>('laender')
  const [quiz, setQuiz] = useState<Region | null>(null)
  const [easy, setEasy] = useState<string | null>(null)
  const theme = profile.settings.theme

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', quiz || easy ? themeOf(theme).ocean : themeOf(theme).bg)
  }, [theme, quiz, easy])

  // Verpasste Tage verrechnen: beim Start und wenn die App wieder in den Vordergrund kommt.
  useEffect(() => {
    actions.settleStreak()
    const onShow = () => document.visibilityState === 'visible' && actions.settleStreak()
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [profile.id])

  if (easy && profile.settings.michelle) {
    return (
      <div className="shell shell--quiz">
        <EasyQuiz key={`${profile.id}-${easy}`} level={levelById(easy)} onExit={() => setEasy(null)} />
      </div>
    )
  }

  if (quiz) {
    return (
      <div className="shell shell--quiz">
        <Quiz key={`${profile.id}-${mode}-${quiz}`} mode={mode} region={quiz} onExit={() => setQuiz(null)} />
      </div>
    )
  }

  return (
    <div className="shell">
      <main>
        {tab === 'lernen' && (
          <Home mode={mode} onMode={setMode} onStart={setQuiz} onEasy={setEasy} onStreak={() => setTab('streak')} />
        )}
        {tab === 'streak' && <StreakScreen />}
        {tab === 'profil' && <ProfileScreen />}
      </main>
      <nav className="tabs" aria-label="Hauptnavigation">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'is-on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
