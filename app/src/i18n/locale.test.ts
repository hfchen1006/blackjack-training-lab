import { describe, expect, it } from 'vitest'
import { resolveLocale } from './locale'

describe('resolveLocale', () => {
  it.each(['en-US', 'en', 'en-GB'])('maps %s to English', (locale) => {
    expect(resolveLocale([locale])).toBe('en-US')
  })

  it.each(['zh-TW', 'zh-Hant', 'zh-Hant-HK', 'ZH-tw'])(
    'maps %s to Traditional Chinese',
    (locale) => {
      expect(resolveLocale([locale])).toBe('zh-TW')
    },
  )

  it('respects the order of supported browser preferences', () => {
    expect(resolveLocale(['en-GB', 'zh-TW'])).toBe('en-US')
    expect(resolveLocale(['zh-TW', 'en-US'])).toBe('zh-TW')
  })

  it('skips unsupported languages before a supported preference', () => {
    expect(resolveLocale(['fr-FR', 'zh-TW', 'en-US'])).toBe('zh-TW')
  })

  it('falls back to English when no preferences are supplied', () => {
    expect(resolveLocale([])).toBe('en-US')
  })

  it.each(['fr-FR', 'zh-CN', 'zh-Hans', 'zh', 'english', 'zh-TWextra'])(
    'falls back to English for unsupported locale %s',
    (locale) => {
      expect(resolveLocale([locale])).toBe('en-US')
    },
  )
})
