import { useEffect, useState } from 'react'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { PracticeMode } from './PracticeMode'
import { SpeedRunMode } from './SpeedRunMode'
import './App.css'

function App({ locale }: { locale: Locale }) {
  const [language, setLanguage] = useState(locale)
  const [showTotal, setShowTotal] = useState(false)
  const [mode, setMode] = useState<'practice' | 'speedRun'>('practice')
  const copy = messages[language]
  useEffect(() => { document.documentElement.lang = language }, [language])

  return (
    <div className="app-shell">
      <header className="site-header"><div><p className="eyebrow">{copy.tagline}</p><h1 lang="en">Blackjack Training Lab</h1></div>
        <label className="language-select">{copy.language}<select value={language} onChange={(event) => setLanguage(event.target.value as Locale)}>
          <option value="en-US">English</option><option value="zh-TW">繁體中文</option>
        </select></label>
      </header>
      <main>
        <nav className="mode-nav" aria-label={copy.trainingModes}>
          <button type="button" aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>{copy.practice}</button>
          <button type="button" aria-pressed={mode === 'speedRun'} onClick={() => setMode('speedRun')}>{copy.speedRun}</button>
        </nav>
        <div className="toolbar"><p className="rules">{copy.rules}</p><button type="button" aria-pressed={showTotal} onClick={() => setShowTotal((value) => !value)}>{showTotal ? copy.hideTotal : copy.showTotal}</button></div>
        {mode === 'practice' ? <PracticeMode locale={language} showTotal={showTotal} /> : <SpeedRunMode locale={language} showTotal={showTotal} />}
      </main>
      <footer><p>{copy.provisional}</p><p>{copy.resetNotice}</p></footer>
    </div>
  )
}

export default App
