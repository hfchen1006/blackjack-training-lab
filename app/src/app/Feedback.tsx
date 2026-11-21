import type { AnswerFeedback } from '../modules/training/training-flow'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { explainFeedback } from '../i18n/format'

export function Feedback({ feedback, locale }: { feedback: AnswerFeedback; locale: Locale }) {
  const copy = messages[locale]
  return <section className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`} aria-label={copy.feedback} role="status" aria-live="polite">
    <h3>{feedback.correct ? `✓ ${copy.correct}` : `× ${copy.incorrect}`}</h3>
    <dl><div><dt>{copy.yourAnswer}</dt><dd>{copy.actions[feedback.selected]}</dd></div>
      <div><dt>{copy.referenceAnswer}</dt><dd>{copy.actions[feedback.recommended]}</dd></div></dl>
    <p>{explainFeedback(feedback, locale)}</p>
  </section>
}
