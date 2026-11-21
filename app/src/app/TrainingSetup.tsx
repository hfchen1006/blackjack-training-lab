import type { ReactNode } from 'react'
import type { Distribution } from '../modules/training/distribution'
import type { Locale } from '../i18n/locale'
import { messages } from '../i18n/messages'

export function TrainingSetup({ locale, seed, distribution, onSeed, onDistribution, children }: {
  locale: Locale; seed: string; distribution: Distribution; onSeed: (value: string) => void;
  onDistribution: (value: Distribution) => void; children?: ReactNode
}) {
  const copy = messages[locale]
  return <>
    <label>{copy.seed}<input value={seed} maxLength={1024} onChange={(event) => onSeed(event.target.value)} /></label>
    <label>{copy.distribution}<select value={distribution} aria-describedby="distribution-description" onChange={(event) => onDistribution(event.target.value as Distribution)}>
      {(['balanced', 'realistic'] as const).map((key) => <option key={key} value={key}>{copy.distributions[key]}</option>)}
    </select></label>
    {children}
    <p className="distribution-description muted" id="distribution-description">{copy.distributionDescriptions[distribution]}</p>
  </>
}
