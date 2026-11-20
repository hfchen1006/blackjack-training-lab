# Phase 1 Acceptance Test Outline (Draft)

The cases below define future validation work. **None of these tests has been run.**

## Rule engine

- Compare Basic Strategy cases against independently maintained reference results for selected profile, including all Hard, Soft and Pair upcards.
- Validate actions available before and after Hit; test Double fallback behavior and split restrictions.
- Verify no standard player decisions are requested after bust, natural finalization, or another terminal state.
- Verify dealer Ace insurance offer occurs before peek, no non-Ace offers, and no accidental leakage of hidden dealer card.
- Verify no-count Insurance recommendation is to decline; if Even Money added, test its distinct presentation.
- Test malformed hand states and impossible card counts fail closed.

## Generator and reproducibility

- On a known seed + generator version + rules + setup, generate the same prompt descriptors in repeated sessions and on independent browsers.
- Changing UI language must not change prompt order.
- Balanced category counts must match the published distribution; Realistic aggregated frequencies should pass broad tolerance checks for finite-deck sampling without fabricating exact odds.
- Continuing prompts must have at least one legal prior Hit sequence and no already-ended state.
- Replay stale/unknown seed/profile versions must show an error rather than silently change the questions.

## Timing

- Time starts when cards become visible and ends on first valid action.
- Key autorepeat and rapid double clicks cause at most one answer.
- Pause, tab switch, app background, and resume exclude background time; paused cards are hidden.
- Report median and P90 recomputed from stored event durations match displayed values.

## UI and multilingual

- Desktop mouse/keyboard; phone portrait touch; no horizontal scrolling.
- All labels, rule descriptions, error messages, feedback, reports, and image templates localized en-US/zh-TW.
- Switching language mid-session preserves answers, timing state, and seed.
- Color is not the only correct/incorrect indicator; focus order and labels remain usable.

## Storage and sharing

- Completed history persists after reload where browser storage is available; clear-history control requires confirmation.
- Image contains the correct numerator/denominator, time metrics, and session metadata; can download on desktop and mobile.
- Challenge link opens in a fresh browser, restores settings, reproduces identical ordered prompt descriptors when Same Seed is used.
- Corrupt, tampered, oversized, or unsupported link parameters cannot execute code or erase history.
- No personal local history or emails are silently included in shareable URLs/images.

## Acceptance gate

No phase is declared complete solely on the basis of screenshots or a single manual quiz. Require strategy reference tests, deterministic generator tests, browser-level checks, and user review.
