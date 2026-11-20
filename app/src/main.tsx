import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { resolveLocale } from './i18n/locale.ts'

const locale = resolveLocale(navigator.languages)
document.documentElement.lang = locale

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App locale={locale} />
  </StrictMode>,
)
