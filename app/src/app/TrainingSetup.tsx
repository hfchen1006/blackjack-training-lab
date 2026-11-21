import type { ReactNode } from 'react'
import type { QuestionScenario } from '../modules/training/question-generator'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'

const primaryScenarios: readonly QuestionScenario[] = ['initial', 'continuing', 'split']

export function TrainingSetup({ locale, seed, scenario, onSeed, onScenario, children }: {
  locale: Locale; seed: string; scenario: QuestionScenario; onSeed: (value: string) => void;
  onScenario: (value: QuestionScenario) => void; children?: ReactNode
}) {
  const copy = messages[locale]
  return <>
    <label>{copy.seed}<input value={seed} maxLength={1024} onChange={(event) => onSeed(event.target.value)} /></label>
    <label>{copy.scenario}<select value={scenario} onChange={(event) => onScenario(event.target.value as QuestionScenario)}>
      {primaryScenarios.map((key) => <option key={key} value={key}>{copy.scenarios[key]}</option>)}
    </select></label>
    {children}
  </>
}
