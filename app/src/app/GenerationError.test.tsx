// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GenerationError } from './GenerationError'
import { messages } from '../i18n/messages'
import type { Locale } from '../i18n/locale'
import { QUESTION_GENERATOR_VERSION } from '../modules/training/question-generator'
import { generateDistributedQuestion } from '../modules/training/distribution'
import { BASELINE_RULE_PROFILE } from '../modules/blackjack/rule-profile'

afterEach(cleanup)
it.each<Locale>(['en-US', 'zh-TW'])('explains extended, exhausted, and nonrecoverable failures in %s', (locale) => {
  const copy = messages[locale]
  const failure = { kind: 'failure', generatorVersion: QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: 2048, lastRejection: null } as const
  const onRetry = vi.fn()
  const { rerender } = render(<GenerationError failure={failure} index={2} locale={locale} canExtend setupHint={copy.practiceRecoverySetup} onRetry={onRetry} />)
  expect(screen.getByRole('alert').textContent).toContain(copy.recoveryAvailable)
  fireEvent.click(screen.getByRole('button', { name: copy.retry }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  rerender(<GenerationError failure={{ ...failure, attempts: 4096 }} index={2} locale={locale} canExtend={false} setupHint={copy.speedRecoverySetup} onRetry={onRetry} />)
  expect(screen.getByRole('alert').textContent).toContain(copy.recoveryExhausted)
  expect(screen.getByRole('alert').textContent).toContain(copy.speedRecoverySetup)
  expect(screen.queryByRole('button', { name: copy.retry })).toBeNull()
  rerender(<GenerationError failure={{ ...failure, reason: 'unsupported-profile', attempts: 0 }} index={2} locale={locale} canExtend={false} setupHint={copy.practiceRecoverySetup} onRetry={onRetry} />)
  expect(screen.getByRole('alert').textContent).toContain(copy.recoveryUnavailable)
  expect(screen.queryByRole('button', { name: copy.retry })).toBeNull()
})

it.each<Locale>(['en-US', 'zh-TW'])('distinguishes category sampling recovery from generator attempts in %s', (locale) => {
  const copy = messages[locale]
  const source = generateDistributedQuestion({ seed: 'category-failure', questionIndex: 0, distribution: 'balanced', profile: BASELINE_RULE_PROFILE, generatorVersion: 'unsupported' })
  if (source.kind !== 'failure') throw new Error('Expected fixture')
  const failure = { ...source, reason: 'category-attempt-limit', source: 'category', candidatesExamined: 128 } as const
  const onRetry = vi.fn()
  const { rerender } = render(<GenerationError failure={failure} index={0} locale={locale} canExtend setupHint={copy.practiceRecoverySetup} onRetry={onRetry} />)
  expect(screen.getByRole('alert').textContent).toContain(copy.errors['category-attempt-limit'])
  expect(screen.getByRole('alert').textContent).toContain(copy.categoryRecoveryAvailable)
  expect(screen.getByRole('alert').textContent).not.toContain(copy.recoveryAvailable)
  fireEvent.click(screen.getByRole('button', { name: copy.categoryRetry }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  rerender(<GenerationError failure={{ ...failure, candidatesExamined: 256 }} index={0} locale={locale} canExtend={false} setupHint={copy.practiceRecoverySetup} onRetry={onRetry} />)
  expect(screen.getByRole('alert').textContent).toContain(copy.categoryRecoveryExhausted)
  expect(screen.queryByRole('button')).toBeNull()
})
