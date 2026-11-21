import { expect, it } from 'vitest'
import { generateQuestion } from '../modules/training/question-generator'
import { BASELINE_RULE_PROFILE } from '../modules/blackjack/rule-profile'
import { questionView } from './question-view'

it('projects only visible cards and legal answers, with no private answer/hole-card data or hidden total', () => {
  const result = generateQuestion({ seed: 'golden', questionIndex: 0, scenario: 'insurance', profile: BASELINE_RULE_PROFILE })
  if (result.kind !== 'generated') throw new Error('Expected fixture')
  const view = questionView(result.question, false)
  expect(view.total).toBeNull()
  expect(Object.keys(view).sort()).toEqual(['id', 'phase', 'playerCards', 'dealerUpcard', 'selectableAnswers', 'provenance', 'total'].sort())
  expect(view.playerCards).toEqual(result.question.playerCards)
  expect(view.playerCards).not.toBe(result.answerKey.input.hand.cards)
  expect(view.selectableAnswers).toEqual(result.question.selectableAnswers)
  expect(questionView(result.question, true).total).toEqual({ value: result.question.handSummary.total, classification: result.question.handSummary.classification })
})
