// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import * as generator from '../modules/training/question-generator'
import { BASELINE_RULE_PROFILE } from '../modules/blackjack/rule-profile'
import { messages } from '../i18n/messages'
import { QuestionDisplay } from './QuestionDisplay'
import { questionView } from './question-view'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const copy = messages['en-US']
function expected(scenario: generator.QuestionScenario = 'initial', seed = 'training-lab', questionIndex = 0) {
  const result = generator.generateQuestion({ seed, questionIndex, scenario, profile: BASELINE_RULE_PROFILE })
  if (result.kind !== 'generated') throw new Error('Fixture generation failed')
  return result
}

describe('Practice checkpoint A', () => {
  it.each(['en-US', 'zh-TW'] as const)('hides key badges while preserving localized labels, focus, and shortcuts in %s', (locale) => {
    const current = expected('initial', 'shortcuts-26')
    const onAnswer = vi.fn()
    const localized = messages[locale]
    render(<QuestionDisplay view={questionView(current.question, false)} locale={locale} disabled={false} onAnswer={onAnswer} />)
    const choices = screen.getByRole('group', { name: localized.choices })
    expect(choices.querySelector('kbd')).toBeNull()
    expect(document.querySelector('.shortcut-hint')).toBeNull()
    for (const [action, key] of [['hit', 'H'], ['stand', 'S'], ['double', 'D'], ['split', 'P']] as const) {
      const button = within(choices).getByRole('button', { name: localized.actions[action] })
      expect(button.textContent?.trim()).toBe(localized.actions[action])
      expect(button.getAttribute('aria-keyshortcuts')).toBe(key)
      expect(button.tabIndex).toBe(0)
      button.focus()
      expect(document.activeElement).toBe(button)
      button.blur()
      fireEvent.keyDown(window, { key: key.toLowerCase() })
      expect(onAnswer).toHaveBeenLastCalledWith(action)
    }
    expect(onAnswer).toHaveBeenCalledTimes(4)
  })

  it('shows only legal answers, accepts one answer, reveals feedback, and advances explicitly', () => {
    const current = expected()
    render(<App locale="en-US" />)
    const choices = screen.getByRole('group', { name: copy.choices })
    expect(within(choices).getAllByRole('button').map((button) => button.textContent?.trim().split(' ')[0]))
      .toHaveLength(current.question.selectableAnswers.length)
    expect(document.querySelector('.hand-total')).toBeNull()
    expect(screen.getByRole('button', { name: copy.next }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(within(choices).getByRole('button', { name: copy.actions[current.answerKey.decision.action] }))
    expect(screen.getByRole('status').textContent).toContain(copy.correct)
    const firstFeedback = screen.getByRole('status').textContent
    fireEvent.click(within(choices).getAllByRole('button')[0])
    expect(screen.getByRole('status').textContent).toBe(firstFeedback)
    expect(within(choices).getAllByRole('button').every((button) => button.hasAttribute('disabled'))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: copy.next }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(expected('initial', 'training-lab', 1).question.id)
  })

  it('reports an incorrect legal choice and a meaningful fallback explanation', () => {
    render(<App locale="en-US" />)
    fireEvent.change(screen.getByLabelText(copy.seed), { target: { value: 'ui-22' } })
    fireEvent.change(screen.getByLabelText(copy.scenario), { target: { value: 'continuing' } })
    fireEvent.click(screen.getByRole('button', { name: copy.apply }))
    const current = expected('continuing', 'ui-22')
    const wrong = current.question.selectableAnswers.find((answer) => answer !== current.answerKey.decision.action)!
    fireEvent.click(screen.getByRole('button', { name: copy.actions[wrong] }))
    expect(screen.getByRole('status').textContent).toContain(copy.incorrect)
    expect(screen.getByRole('status').textContent).toContain(copy.actions[current.answerKey.decision.action])
    expect(screen.getByRole('status').textContent).toContain('S17 reference')
    expect(screen.getByRole('status').textContent).toContain('Double is unavailable')
    expect(screen.getByRole('status').textContent).toContain('Stand')
  })

  it('does not regenerate on language/total changes and localizes cards and feedback', () => {
    const spy = vi.spyOn(generator, 'generateQuestion')
    render(<App locale="en-US" />)
    const initialId = document.querySelector('.question-table')?.getAttribute('data-question-id')
    const calls = spy.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: copy.showTotal }))
    expect(document.querySelector('.hand-total')).not.toBeNull()
    fireEvent.change(screen.getByLabelText(copy.language), { target: { value: 'zh-TW' } })
    expect(spy.mock.calls.length).toBe(calls)
    expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(initialId)
    expect(screen.getByLabelText(messages['zh-TW'].hiddenCard)).toBeTruthy()
    expect(document.documentElement.lang).toBe('zh-TW')
    expect(within(screen.getByLabelText(messages['zh-TW'].scenario)).getAllByRole('option').map((option) => option.getAttribute('value')))
      .toEqual(['initial', 'continuing', 'split'])
    fireEvent.click(within(screen.getByRole('group', { name: messages['zh-TW'].choices })).getAllByRole('button')[0])
    expect(screen.getByRole('status').textContent).toContain(messages['zh-TW'].referenceAnswer)
  })

  it('offers only the three primary scenarios and keeps each operational', () => {
    render(<App locale="en-US" />)
    expect(within(screen.getByLabelText(copy.scenario)).getAllByRole('option').map((option) => option.getAttribute('value')))
      .toEqual(['initial', 'continuing', 'split'])
    fireEvent.keyDown(window, { key: 'h', repeat: true })
    expect(screen.queryByRole('status')).toBeNull()
    for (const scenario of ['initial', 'continuing', 'split'] as const) {
      fireEvent.change(screen.getByLabelText(copy.seed), { target: { value: 'golden' } })
      fireEvent.change(screen.getByLabelText(copy.scenario), { target: { value: scenario } })
      fireEvent.click(screen.getByRole('button', { name: copy.apply }))
      const current = expected(scenario, 'golden')
      expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(current.question.id)
      const choices = screen.getByRole('group', { name: copy.choices })
      expect(within(choices).getAllByRole('button').length).toBe(current.question.selectableAnswers.length)
    }
  })

  it('preserves existing side-decision display and keyboard support without a primary selector entry', () => {
    const current = expected('even-money', 'golden')
    const onAnswer = vi.fn()
    render(<QuestionDisplay view={questionView(current.question, false)} locale="en-US" disabled={false} onAnswer={onAnswer} />)
    const choices = screen.getByRole('group', { name: copy.choices })
    expect(within(choices).queryByRole('button', { name: 'Hit' })).toBeNull()
    expect(within(choices).getByRole('button', { name: copy.actions['take-even-money'] })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'x', repeat: true })
    expect(onAnswer).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'x' })
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('decline-insurance')
  })

  it('handles generation failure without showing playable answers or skipping the index', () => {
    const fail = { kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: 2048, lastRejection: null } as const
    const spy = vi.spyOn(generator, 'generateQuestion').mockReturnValueOnce(fail)
    render(<App locale="en-US" />)
    expect(screen.getByRole('alert').textContent).toContain('index has not changed')
    expect(screen.queryByRole('group', { name: copy.choices })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.retry }))
    expect(spy.mock.calls[0][0].questionIndex).toBe(0)
    expect(spy.mock.calls[1][0].questionIndex).toBe(0)
    expect(spy.mock.calls.map(([input]) => input.maxAttempts)).toEqual([2048, 4096])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ends recovery after one extension and lets Practice setup start a new sequence', () => {
    const spy = vi.spyOn(generator, 'generateQuestion').mockImplementation((input) => ({
      kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: input.maxAttempts!, lastRejection: null,
    }))
    render(<App locale="en-US" />)
    fireEvent.click(screen.getByRole('button', { name: copy.retry }))
    expect(screen.getByRole('alert').textContent).toContain(copy.recoveryExhausted)
    expect(screen.queryByRole('button', { name: copy.retry })).toBeNull()
    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
    fireEvent.change(screen.getByLabelText(copy.seed), { target: { value: 'golden' } })
    fireEvent.click(screen.getByRole('button', { name: copy.apply }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(expected('initial', 'golden').question.id)
  })
})
