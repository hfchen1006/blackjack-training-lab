import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import './App.css'

function App({ locale }: { locale: Locale }) {
  const copy = messages[locale]

  return (
    <main className="app-shell">
      <div className="project-placeholder">
        <p className="development-status">{copy.status}</p>
        <h1 lang="en">Blackjack Training Lab</h1>
        <p className="project-description">{copy.description}</p>
      </div>
    </main>
  )
}

export default App
