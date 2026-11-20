export type Locale = 'en-US' | 'zh-TW'

// Use the first supported browser preference; other locales fall back to English.
export function resolveLocale(preferredLocales: readonly string[]): Locale {
  for (const locale of preferredLocales) {
    if (/^en(-|$)/i.test(locale)) return 'en-US'
    if (/^zh-(tw|hant)(-|$)/i.test(locale)) return 'zh-TW'
  }

  return 'en-US'
}
