// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SpeedRunMode } from './SpeedRunMode'
import { messages } from '../i18n/messages'
import { BASELINE_RULE_PROFILE } from '../modules/blackjack/rule-profile'
import * as generator from '../modules/training/question-generator'
import App from './App'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })
async function flush() { await act(async () => { await Promise.resolve() }) }
const en = messages['en-US']

describe('Speed Run checkpoint B', () => {
  it('offers all lengths, withholds answers, completes a timed run, reviews records, and restarts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let now = 0
    const clock = { now: () => now }
    render(<SpeedRunMode locale="en-US" showTotal={false} clock={clock} />)
    expect((screen.getByLabelText(en.sessionLength) as HTMLSelectElement).value).toBe('50')
    expect(within(screen.getByLabelText(en.sessionLength)).getAllByRole('option').map((option) => option.textContent)).toEqual(['25', '50', '100'])
    expect((screen.getByLabelText(en.scenario) as HTMLSelectElement).value).toBe('initial')
    fireEvent.change(screen.getByLabelText(en.sessionLength), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    const firstId = document.querySelector('.question-table')?.getAttribute('data-question-id')
    expect(document.querySelector('.answer-controls kbd')).toBeNull()
    for (let index = 0; index < 25; index += 1) {
      const result = generator.generateQuestion({ seed: 'training-lab', scenario: 'initial', questionIndex: index, profile: BASELINE_RULE_PROFILE })
      if (result.kind !== 'generated') throw new Error('Expected fixture')
      const selected = index === 0 ? result.question.selectableAnswers.find((answer) => answer !== result.answerKey.decision.action)! : result.answerKey.decision.action
      now += 100
      fireEvent.click(within(screen.getByRole('group', { name: en.choices })).getByRole('button', { name: en.actions[selected] }))
      if (index < 24) {
        expect(screen.queryByText(en.referenceAnswer)).toBeNull()
        expect(screen.queryByRole('group', { name: en.reviewFilters })).toBeNull()
        expect(screen.queryByRole('region', { name: en.results })).toBeNull()
        now += 300
        await act(async () => { vi.advanceTimersByTime(300) })
        await flush()
      }
    }
    const report = screen.getByRole('region', { name: en.results })
    expect(report.textContent).toContain('96%')
    expect(report.textContent).toContain('24 / 25')
    expect(report.textContent).toContain('2.50 s')
    expect(report.textContent).toContain('0.10 s')
    const metrics = report.querySelector('.metrics')!.textContent
    expect(screen.getByRole('button', { name: 'Incorrect (1)' }).getAttribute('aria-pressed')).toBe('true')
    expect(report.querySelectorAll('details')).toHaveLength(1)
    const incorrect = report.querySelector('details')!
    expect(incorrect.classList.contains('review-incorrect')).toBe(true)
    expect(incorrect.querySelector('summary')?.textContent).toContain('× Incorrect')
    expect(incorrect.querySelector('summary')?.textContent).toContain('Selected:')
    expect(incorrect.querySelector('summary')?.textContent).toContain('Recommended:')
    expect(incorrect.querySelector('summary')?.textContent).toContain('Response: 0.10 s')
    fireEvent.click(screen.getByRole('button', { name: 'Correct (24)' }))
    expect(report.querySelectorAll('details')).toHaveLength(24)
    expect(report.querySelector('summary')?.textContent).toMatch(/^Question 2 /)
    fireEvent.click(screen.getByRole('button', { name: 'All (25)' }))
    expect(report.querySelectorAll('details')).toHaveLength(25)
    expect([...report.querySelectorAll('summary')].map((item) => item.textContent?.match(/^Question (\d+)/)?.[1]))
      .toEqual(Array.from({ length: 25 }, (_, index) => String(index + 1)))
    expect(report.querySelector('.metrics')!.textContent).toBe(metrics)
    fireEvent.click(screen.getByRole('button', { name: en.anotherRun }))
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(firstId)
  })

  it('hides cards on focus loss, preserves the question across language changes, and ignores key repeats', async () => {
    let now = 0
    const clock = { now: () => now }
    const { rerender } = render(<SpeedRunMode locale="en-US" showTotal={false} clock={clock} />)
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    const id = document.querySelector('.question-table')?.getAttribute('data-question-id')
    now = 100
    fireEvent.blur(window)
    expect(document.querySelector('.playing-card')).toBeNull()
    rerender(<SpeedRunMode locale="zh-TW" showTotal={false} clock={clock} />)
    expect(screen.getByRole('status').textContent).toContain(messages['zh-TW'].paused)
    now = 10000
    fireEvent.click(screen.getByRole('button', { name: messages['zh-TW'].resume }))
    await flush()
    expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(id)
    fireEvent.keyDown(window, { key: 'h', repeat: true })
    expect(screen.queryByText(messages['zh-TW'].answerRecorded)).toBeNull()
  })

  it('keeps generation errors on the same unanswered index and retries without skipping', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const actual = generator.generateQuestion
    let fail = true
    const spy = vi.spyOn(generator, 'generateQuestion').mockImplementation((request) => request.questionIndex === 1 && fail
      ? { kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: 2048, lastRejection: null }
      : actual(request))
    render(<SpeedRunMode locale="en-US" showTotal={false} />)
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    fireEvent.click(within(screen.getByRole('group', { name: en.choices })).getAllByRole('button')[0])
    await act(async () => { vi.advanceTimersByTime(300) })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('group', { name: en.choices })).toBeNull()
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await flush()
    expect(spy.mock.calls.map(([input]) => input.questionIndex)).toEqual([0, 1, 1])
    expect(spy.mock.calls.map(([input]) => input.maxAttempts)).toEqual([2048, 2048, 4096])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('preserves completed answers through exhausted recovery and can end without a false report', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const actual = generator.generateQuestion
    const spy = vi.spyOn(generator, 'generateQuestion').mockImplementation((input) => input.questionIndex === 1
      ? { kind: 'failure', generatorVersion: generator.QUESTION_GENERATOR_VERSION, reason: 'attempt-limit', attempts: input.maxAttempts!, lastRejection: null }
      : actual(input))
    render(<SpeedRunMode locale="en-US" showTotal={false} />)
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    fireEvent.click(within(screen.getByRole('group', { name: en.choices })).getAllByRole('button')[0])
    await act(async () => { vi.advanceTimersByTime(300) })
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    expect(screen.getByRole('alert').textContent).toContain(en.recoveryExhausted)
    expect(screen.queryByRole('button', { name: en.retry })).toBeNull()
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1')
    expect(spy.mock.calls.map(([input]) => [input.questionIndex, input.maxAttempts])).toEqual([[0, 2048], [1, 2048], [1, 4096]])
    expect(screen.queryByRole('region', { name: en.results })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.endRun }))
    expect(screen.getByRole('button', { name: en.startRun })).toBeTruthy()
    expect(screen.queryByRole('region', { name: en.results })).toBeNull()
  })

  it('renders ordinary continuing decisions and a perfect result in Traditional Chinese', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const copy = messages['zh-TW']
    render(<SpeedRunMode locale="zh-TW" showTotal={false} />)
    expect(within(screen.getByLabelText(copy.scenario)).getAllByRole('option').map((option) => option.getAttribute('value')))
      .toEqual(['initial', 'continuing', 'split'])
    fireEvent.change(screen.getByLabelText(copy.scenario), { target: { value: 'continuing' } })
    fireEvent.change(screen.getByLabelText(copy.sessionLength), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: copy.startRun }))
    await flush()
    for (let index = 0; index < 25; index += 1) {
      const choices = screen.getByRole('group', { name: copy.choices })
      const current = generator.generateQuestion({ seed: 'training-lab', questionIndex: index, scenario: 'continuing', profile: BASELINE_RULE_PROFILE })
      if (current.kind !== 'generated') throw new Error('Expected fixture')
      expect(within(choices).queryByRole('button', { name: copy.actions['take-insurance'] })).toBeNull()
      fireEvent.click(within(choices).getByRole('button', { name: copy.actions[current.answerKey.decision.action] }))
      if (index < 24) { await act(async () => { vi.advanceTimersByTime(300) }); await flush() }
    }
    const report = screen.getByRole('region', { name: copy.results })
    expect(report.textContent).toContain('100%')
    expect(report.textContent).toContain(copy.average)
    expect(report.textContent).toContain(copy.perfectRun)
    expect(report.querySelectorAll('details')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '全部（25）' }))
    expect(report.querySelectorAll('details')).toHaveLength(25)
    expect(report.textContent).toContain(copy.referenceAnswer)
  })

  it('starts each remaining primary scenario through the same Speed Run setup', async () => {
    render(<SpeedRunMode locale="en-US" showTotal={false} />)
    for (const scenario of ['initial', 'continuing', 'split'] as const) {
      expect(within(screen.getByLabelText(en.scenario)).getAllByRole('option').map((option) => option.getAttribute('value')))
        .toEqual(['initial', 'continuing', 'split'])
      fireEvent.change(screen.getByLabelText(en.scenario), { target: { value: scenario } })
      fireEvent.click(screen.getByRole('button', { name: en.startRun }))
      await flush()
      const current = generator.generateQuestion({ seed: 'training-lab', questionIndex: 0, scenario, profile: BASELINE_RULE_PROFILE })
      if (current.kind !== 'generated') throw new Error('Expected fixture')
      expect(document.querySelector('.question-table')?.getAttribute('data-question-id')).toBe(current.question.id)
      fireEvent.click(screen.getByRole('button', { name: en.endRun }))
    }
  })

  it('resets mode-specific progress while preserving language and total visibility', async () => {
    render(<App locale="en-US" />)
    fireEvent.click(screen.getByRole('button', { name: en.showTotal }))
    fireEvent.click(within(screen.getByRole('group', { name: en.choices })).getAllByRole('button')[0])
    fireEvent.click(screen.getByRole('button', { name: en.next }))
    expect(screen.getByText('Question 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.speedRun }))
    fireEvent.click(screen.getByRole('button', { name: en.startRun }))
    await flush()
    fireEvent.click(screen.getByRole('button', { name: en.practice }))
    expect(screen.getByText('Question 1')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: en.hideTotal })).toBeTruthy()
  })
})
