# Phase 1 Acceptance & QA Plan — Alpha Status

Last synchronized: **2026-11-20**, source `feature/phase1c-training-system`.

**Evidence scope:** Codex reported **412 passing Vitest tests across 20 files** at Phase 1C.4. Deployment preparation reported **21 targeted UI tests**, build/lint and desktop/320–390px Chromium touch emulation, including six completed 25-question runs. The maintainer opened the live site on a phone. These are historical checkpoint results; **no tests are re-run by this document update**. Comprehensive iOS Safari / Android acceptance remains open.

## Rule engine and strategy — Implemented/tested

- Independent S17/DAS Hard, Soft and exact-rank Pair reference fixture; legality, Double/Split fallback and terminal-state rejection.
- Multiple Aces, split limits, dealer peek and unsupported input handling.
- Insurance/Even Money **underlying domain tests**; their standalone prompts are not present in the Alpha UI, and that absence is intentional.
- Revalidate profile-dependent cases if provisional rules become configurable; preserve already-approved core.

## Generator and distribution — Implemented/tested

- Same seed/index/profile/algorithm versions reproduce question descriptors; UI language and total visibility do not reshuffle an active session.
- Balanced 25/50/100 category counts differ by no more than one; exact-rank Pair precedence; reachable Continuing/Split; bounded candidate failure and one deterministic extended retry.
- Realistic: natural initial two-card decisions, fresh six-deck shoe per question, no quotas, no non-actionable natural/dealer Blackjack rounds.
- Independent six-deck enumeration and a 12,000-question sample documented in `TRAINING_DISTRIBUTIONS.md`.
- Future Challenge Link must validate stale or unknown generator/distribution/rule versions and reproduce ordered descriptors across devices.

## Training UI and timing — Implemented/tested; real-device QA partial

- Practice: immediate answer locking, correctness feedback, explanation, Next.
- Speed Run: 25/50/100, end-only feedback, pause/resume, correct timing, All/Incorrect/Correct filters, Perfect Run, duplicate-submission guards.
- Shortcuts H/S/D/P still work without small visible badge text; focus and accessibility labels preserved.
- Pause/visibility excludes background time and hides cards. **Remaining:** check real mobile lock/unlock, backgrounding, rotation and low-end devices.

## Localization, touch and accessibility — Partial release acceptance

- English/Traditional Chinese flows and current mid-session language change; hand-total toggle does not regenerate current question.
- Chromium desktop and 320/375/390px touch-emulated browser smoke tests reportedly passed with no horizontal overflow/errors.
- Site loads on a phone per the maintainer, but full Safari/Android behavior, screen reader/accessibility audit, text zoom and language persistence remain to be verified or implemented.

## Phase 1D — Session history and Weakness Drill (Pending)

- Browser-local versioned persistence for completed sessions and per-question events; safe migration and clear-history confirmation.
- Correct restored totals and timestamps after reload; corrupt data must fail safely.
- Per-decision-case accuracy and reaction-time distribution, median/P90; manual review and an independently scored Weakness Drill.
- Do not silently adapt comparable Speed Runs. The current Alpha keeps records only in memory.

## Phase 1E — Share and challenge (Pending)

- Bilingual shareable PNG with accurate selected result metadata, nickname handling, download and native share fallback.
- Safe Same-Seed Challenge Link restores count/distribution/rules and compatible generator/distribution versions; validates malformed, oversized, tampered and stale links.
- Independent mobile/desktop and cross-language equivalence; no private local history or hidden tracking data in URL/image.
- Auto-generated normal Seed with optional Advanced Settings custom Seed; **not yet implemented**.

## Release and privacy gate

- Public Alpha Pages workflow runs tests/lint/build and deploys `app/dist` on pushes to the approved feature branch.
- Live URL: https://hfchen1006.github.io/blackjack-training-lab/ (phone access confirmed by maintainer).
- Recheck a later deployment run after merge, then complete real-device, accessibility, persistence, sharing and privacy reviews before marking all of Phase 1 complete.
- An online Alpha, a single manual demo or historical test results alone do not constitute final release acceptance.
