import type { Locale } from './locale'

type PlaceholderMessages = {
  status: string
  description: string
}

export const messages = {
  'en-US': {
    status: 'Under development',
    description: 'A place to practice Blackjack decisions. Training features are still being built.',
  },
  'zh-TW': {
    status: '開發中',
    description: '練習二十一點決策的園地。訓練功能仍在開發中。',
  },
} satisfies Record<Locale, PlaceholderMessages>
