import type { QuestionGenerationResult } from '../modules/training/question-generator'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { format } from '../i18n/format'

export function GenerationError({ failure, index, locale, canExtend, setupHint, onRetry }: {
  failure: Extract<QuestionGenerationResult, { kind: 'failure' }>; index: number; locale: Locale;
  canExtend: boolean; setupHint: string; onRetry: () => void
}) {
  const copy = messages[locale]
  return <div className="error-panel" role="alert">
    <p>{format(copy.generationError, { number: index + 1 })}</p>
    <p>{format(copy.errorDetail, { reason: copy.errors[failure.reason] })}</p>
    <p>{failure.reason !== 'attempt-limit' ? copy.recoveryUnavailable : canExtend ? copy.recoveryAvailable : copy.recoveryExhausted}</p>
    {canExtend && <button type="button" onClick={onRetry}>{copy.retry}</button>}
    <p>{setupHint}</p>
  </div>
}
