import { expect, it } from 'vitest'
import { generateQuestion } from '../modules/training/question-generator'
import { BASELINE_RULE_PROFILE } from '../modules/blackjack/rule-profile'
import { assessAnswer } from '../modules/training/training-flow'
import { explainFeedback } from './format'

it('explains the approved Double-to-Stand fallback in both languages without changing the recommendation', () => {
  const result = generateQuestion({ seed: 'ui-22', questionIndex: 0, scenario: 'continuing', profile: BASELINE_RULE_PROFILE })
  if (result.kind !== 'generated') throw new Error('Expected fixture')
  const feedback = assessAnswer(result, 'hit')!
  expect(feedback.decision).toMatchObject({ kind: 'action', preferredAction: 'double', action: 'stand', usedFallback: true })
  const english = explainFeedback(feedback, 'en-US')
  const chinese = explainFeedback(feedback, 'zh-TW')
  expect(english).toContain('Double is unavailable')
  expect(english).toContain('Stand')
  expect(chinese).toContain('目前狀態無法「加倍（Double）」')
  expect(chinese).toContain('停牌（Stand）')
  expect(english + chinese).not.toMatch(/\{\w+\}/)
  expect(feedback.recommended).toBe('stand')
})
