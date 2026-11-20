/**
 * Independent published-table transcription. No production imports.
 * Dealer order: 2, 3, 4, 5, 6, 7, 8, 9, 10, Ace.
 * H=Hit, S=Stand, D=Double/otherwise Hit, d=Double/otherwise Stand.
 * Pair Y/N is the DAS-enabled splitting decision, not a legal-action test.
 */
export const S17_DAS_REFERENCE_V1 = {
  version: 's17-das-reference-v1',
  sources: [
    'https://wizardofodds.com/games/blackjack/strategy/4-decks/',
    'https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf',
  ],
  dealerUpcards: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'],
  hard: {
    4: 'HHHHHHHHHH',
    5: 'HHHHHHHHHH',
    6: 'HHHHHHHHHH',
    7: 'HHHHHHHHHH',
    8: 'HHHHHHHHHH',
    9: 'HDDDDHHHHH',
    10: 'DDDDDDDDHH',
    11: 'DDDDDDDDDH',
    12: 'HHSSSHHHHH',
    13: 'SSSSSHHHHH',
    14: 'SSSSSHHHHH',
    15: 'SSSSSHHHHH',
    16: 'SSSSSHHHHH',
    17: 'SSSSSSSSSS',
    18: 'SSSSSSSSSS',
    19: 'SSSSSSSSSS',
    20: 'SSSSSSSSSS',
  },
  soft: {
    13: 'HHHDDHHHHH',
    14: 'HHHDDHHHHH',
    15: 'HHDDDHHHHH',
    16: 'HHDDDHHHHH',
    17: 'HDDDDHHHHH',
    18: 'SddddSSHHH',
    19: 'SSSSSSSSSS',
    20: 'SSSSSSSSSS',
  },
  pairs: {
    A: 'YYYYYYYYYY',
    '2': 'YYYYYYNNNN',
    '3': 'YYYYYYNNNN',
    '4': 'NNNYYNNNNN',
    '5': 'NNNNNNNNNN',
    '6': 'YYYYYNNNNN',
    '7': 'YYYYYYNNNN',
    '8': 'YYYYYYYYYY',
    '9': 'YYYYYNYYNN',
    '10': 'NNNNNNNNNN',
  },
  // Wizard's explicit capped-pair instruction: play the hard total, except Aces.
  // Baseline split Aces auto-complete instead of needing an ordinary fallback.
  pairFallbackTotals: { '2': 4, '3': 6, '4': 8, '5': 10, '6': 12, '7': 14, '8': 16, '9': 18, '10': 20 },
} as const
