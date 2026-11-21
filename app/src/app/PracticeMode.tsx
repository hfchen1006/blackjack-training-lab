import { useState } from 'react'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'
import { format } from '../i18n/format'
import { answerPractice, nextPractice, retryPractice, startPractice } from '../modules/training/practice'
import { canExtendGeneration, trainingConfig } from '../modules/training/training-flow'
import type { Distribution } from '../modules/training/distribution'
import { questionView } from './question-view'
import { QuestionDisplay } from './QuestionDisplay'
import { TrainingSetup } from './TrainingSetup'
import { Feedback } from './Feedback'
import { GenerationError } from './GenerationError'

export function PracticeMode({ locale, showTotal }: { locale: Locale; showTotal: boolean }) {
  const copy = messages[locale]
  const [seed, setSeed] = useState('training-lab')
  const [distribution, setDistribution] = useState<Distribution>('balanced')
  const [state, setState] = useState(() => startPractice(trainingConfig()))
  return <section aria-label={copy.practice}>
    <div className="mode-heading"><h2>{copy.practice}</h2><p>{copy.practiceIntro}</p></div>
    <form className="setup-form" onSubmit={(event) => { event.preventDefault(); setState(startPractice(trainingConfig(seed, distribution))) }}>
      <TrainingSetup locale={locale} seed={seed} distribution={distribution} onSeed={setSeed} onDistribution={setDistribution} />
      <button type="submit">{copy.apply}</button>
    </form>
    <h3 className="question-number" aria-live="polite">{format(copy.question, { number: state.index + 1 })}</h3>
    {state.current.kind === 'failure'
      ? <GenerationError failure={state.current} index={state.index} locale={locale} canExtend={canExtendGeneration(state.current, state.attemptBudget)} setupHint={copy.practiceRecoverySetup} onRetry={() => setState(retryPractice)} />
      : <QuestionDisplay view={questionView(state.current.question, showTotal)} locale={locale} disabled={state.feedback !== null}
        onAnswer={(answer) => setState((current) => answerPractice(current, answer))} />}
    {state.feedback && <Feedback feedback={state.feedback} locale={locale} />}
    <button className="primary next-question" type="button" disabled={!state.feedback} onClick={() => setState(nextPractice)}>{copy.next}</button>
  </section>
}
