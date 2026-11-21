# Blackjack Training Lab — Phase 1 MVP Specification

- **Version:** 0.3 (Alpha implementation alignment)
- **Last synchronized:** 2026-11-20
- **Owner:** Product owner
- **Status:** Living Phase 1 specification. Phase 1C Alpha is implemented and live; future features are not automatically approved. See `DECISIONS.md` for explicit decisions and supersessions.
- **Delivery target:** Responsive static web app, local-first
- **Languages:** English (en-US) and Traditional Chinese (zh-TW)

## Current implementation snapshot — 2026-11-20

**Playable Alpha:** Practice immediate feedback; Speed Run 25/50/100 with final-only report and All/Incorrect/Correct filters; versioned deterministic Balanced/Realistic; English/Traditional Chinese; hand-total toggle; responsive UI. The maintainer opened the public GitHub Pages site on a phone, but full device acceptance is outstanding.

**Amendments since the planning baseline:**

- Main setup uses **Balanced / Realistic**, not standalone Initial / Continuing / Mixed choices.
- Balanced targets near-equal Hard / Soft / Pair coverage and may internally mix Initial / Continuing / Split provenance with a provisional 80/15/5 policy.
- Realistic samples naturally dealt **actionable initial hands only**; full continuing gameplay belongs to Casino Simulator.
- Dedicated Insurance/Even Money UI prompts are deferred, while underlying engine support remains.
- Session history is **in memory only**. Persistent history, Weakness Drill, richer metrics, PNG sharing, Challenge Link and Advanced Seed UX are planned, not playable.
- Manual Seed input remains visible for Alpha testing. Agreed future UI: auto-generated ordinary seed and optional custom entry under Advanced Settings.
- Only S17 and DAS have their stated approval statuses; other fixed casino defaults remain provisional.

For exact distribution behavior see [TRAINING_DISTRIBUTIONS.md](TRAINING_DISTRIBUTIONS.md), and for planned vs delivered work see [BACKLOG.md](BACKLOG.md). This document covers the full Phase 1 *target*, not only the current Alpha.

## 1. Scope and intent

Phase 1 is a Basic Strategy **decision trainer**, not a full wager-and-settlement casino simulator. It aims to improve correct decisions and reduce reaction time, provide targeted follow-up practice, and allow friends to share a comparable challenge.

No real-money betting, payments, logins, cloud database, multiplayer synchronization, or authoritative leaderboard are required.

## 2. Decision status key

- **Confirmed:** explicitly selected by the product owner.
- **Accepted default:** chosen as the initial configuration, without a claim it matches every real casino table.
- **Proposed:** an implementation choice to review; not formally approved.

## 3. Rule profile

| Rule | Phase 1 default | Status |
| --- | --- | --- |
| Dealer soft 17 | S17 | Confirmed |
| Double after split | Allowed (DAS) | Accepted default |
| Number of decks | 6 | Proposed |
| Surrender | No surrender | Proposed (actual table rules unknown) |
| Dealer blackjack check | American peek | Proposed |
| Double | First two cards; rules permit doubles after splits | Proposed |
| Natural blackjack payout | 3:2 | Proposed; informational until settlement exists |
| Max split hands | 4 | Proposed; mainly a future simulator rule |
| Re-split aces | No | Proposed |
| Draw to split aces | No | Proposed |

**Strategy reference model:** Rule-dependent total-dependent Basic Strategy for the default profile, checked against authoritative charts / calculator outputs. Avoid asserting that the total-dependent answer is necessarily the mathematically best composition-dependent decision for a specific 3+ card hand. Explicit counting deviations are out of Phase 1.

A question record must include the rule-profile version and legal-action context so changing settings cannot silently change the meaning of historical scores.

## 4. Training modes

### 4.1 Practice

- Immediate Correct / Incorrect feedback after each decision, with correct action and concise explanation.
- Manual Next button or equivalent keyboard action.
- **Planned:** a standalone strategy reference without losing work. Current Alpha gives concise explanations after answering.
- Optional category filtering and adaptive question selection are proposed.

### 4.2 Speed Run

- Default: **50 scored decision prompts**. Proposed quick options: 25 / 50 / 100.
- Distribution selected before each run: **Balanced** or **Realistic**.
- **Current:** no standalone hand-state selector. Balanced may mix legal Initial/Continuing/Split provenance; Realistic is Initial only.
- No correctness feedback during the run; a report follows completion.
- No mandatory time limit by default. Time each decision independently.
- Hand total is toggleable, **hidden by default**; record this setting with results.
- Provide progress and pause / resume / exit controls.

### 4.3 Hand-state definitions (current Alpha)

- **Initial:** an actionable first decision on the two-card player hand.
- **Continuing:** reachable post-Hit decision with its prior action history and restricted legal actions.
- **Split:** reachable split-derived decision following the relevant rule constraints.
- **Mixed:** historical independent setup concept, **not** a current UI selector.

One prompt represents one scored decision, not a full round. Balanced may include Continuing/Split provenance internally; Realistic only presents actionable Initial decisions. Full round progression belongs in a later Casino Simulator. Breakdown analytics are planned for Phase 1D.

## 5. Insurance and Even Money — deferred standalone drills

The current Practice and Speed Run UI **do not** display standalone Insurance or Even Money question types. Their generator and rule-engine support remains available for future Casino Simulator work. Ordinary Realistic initial-hand prompts internally resolve applicable pre-peek side-offer/peek stages before asking the main decision.

The original plan to count standalone Insurance prompts in a 50-question Speed Run has been **superseded**. Do not mix Insurance/Even Money events into Hard/Soft/Pair strategy accuracy or show them as Hit/Stand prompts. Non-counting Basic Strategy's internal Insurance recommendation is to decline.

## 6. Question-generation contracts

### Balanced — implemented (`training-distribution-v1`)

- Every three questions target one Hard, one Soft and one exact-rank Pair; counts differ by at most one for completed 25/50/100 runs.
- Seed affects category ordering/remainders. 10+J is Hard, not a pair. Pair classification takes precedence over Soft.
- A provisional 60-question provenance plan targets 48 Initial / 9 Continuing / 3 Split, while ensuring legal reachability and category balance.
- Bounded candidate sampling favors dealer-upcard and strategy-case diversity when feasible; explicit failure and a single extended recovery are provided.
- The system does not weight difficult categories adaptively during benchmark Speed Runs.

### Realistic — implemented (`training-distribution-v1`)

- Sample from a fresh finite six-deck shoe each question without replacement within the round.
- Handle dealer peek and pre-peek Insurance internally; exclude non-actionable Blackjack/terminal rounds.
- Only naturally dealt actionable **initial two-card** decisions; no Hard/Soft/Pair quotas, Continuing/Split or forced strategy variety.
- This is a *conditional initial-decision distribution*, not a full game or persistent shoe.

See `TRAINING_DISTRIBUTIONS.md` for versions, math, seed/retry policy and limitations.

### Scoring and rule fidelity

- Derive legal actions from current state.
- Handle player blackjack, bust, dealer peek, and insurance stages explicitly.
- No ordinary action choices on a finished hand.
- Test reference decisions for edge cases, including conditional Double/Split possibilities and S17 interactions.
- A disabled Double option must not turn the answer into an automatic mistake; the engine needs the correct fallback action for that specific rule/state.

## 7. User interface and accessibility

### Setup screen

Current setup: Practice/Speed Run, distribution, Speed Run question count, visible custom Seed, language and hand-total toggle. No hand-category selector or rule editor. Future UX: auto-generate ordinary seeds and put optional custom input in Advanced Settings.

### Training screen

Dealer upcard above, hidden card when applicable, player cards below, visible progress, accessible decision buttons. Keyboard shortcuts on desktop: H = Hit, S = Stand, D = Double, P = Split. Visible per-button shortcut badges were removed; keyboard functionality remains. No standalone Insurance/Even Money stage appears in the Alpha UI.

- Ignore keyboard auto-repeat so one keypress cannot answer multiple consecutive prompts.
- During pause or loss of focus, hide the cards and suspend the timer.
- Begin timing when the rendered prompt is ready; end when a valid choice is recorded.
- Prevent pointer/keyboard double-submission during transitions.
- No lengthy forced deal animations. Proposed next-question delay: ~300 ms.
- Ensure keyboard navigation, screen-reader labels, touch target sizes, and color-independent correctness indicators.

### Session report and review

**Current Alpha:** accuracy, counts, total/average answering time, final-only All/Incorrect/Correct review, selected/reference action and per-question response time. **Phase 1D plan:** median/P90, richer strategy-case and provenance breakdowns and persistent results. Standalone Insurance reporting is not part of the current trainer. Keep accuracy and speed separate.

### Weakness Drill

User starts deliberately from a session report or training menu. Draw from incorrect decisions and unusually slow correct decisions; distinguish these reasons. Adaptive sampling is allowed here, **not silently applied to the comparable Speed Run benchmark**. Track Weakness Drill results separately.

## 8. Skill analysis

- Define the unit of weakness as a **decision situation** (hand category, total/pair, dealer upcard, stage, permitted actions, rule profile), not just a hand total.
- Maintain error count, exposure count, reaction-time distribution, and last-practiced time.
- Do not claim that a skill is mastered from a single perfect result or tiny sample.
- Proposed starting mastery target (non-normative): accuracy >= 98%, median <= 2.0 seconds, repeated over multiple sessions with sufficient sample sizes.
- Thresholds should remain configurable or clearly described as goals, not objective casino-performance certifications.

## 9. Bilingual requirements

- All interactive UI copy, messages, tooltips, errors, reviews, rule explanations, sharing text, and the image card template must exist in **English and Traditional Chinese**.
- The interface initializes from browser locale and can switch manually without regenerating the question; preference persistence across reload is **not implemented**.
- Standard game action labels can keep their internationally recognizable English terms with Chinese descriptions.
- Switching language must not regenerate the question sequence or reset a session.
- QA must cover long translations, mixed Latin/CJK text, and narrow mobile layouts.

## 10. Mobile and desktop

- Responsive, touch-friendly site usable from phones and desktops without a separate native app.
- Primary support targets: current desktop Chrome/Edge and recent mobile Safari/Chrome; exact support matrix to be specified during implementation.
- Phone portrait mode must show legible cards and reachable, comfortably sized choices without horizontal scrolling.
- Browser backgrounding, screen rotation, and accidental gesture / double taps must not spoil timing or submit duplicate actions.

## 11. Share as Image — confirmed Phase 1 feature

- From a completed Speed Run report, generate one readable **PNG results card**.
- Include optional nickname; accurate numerator/denominator, session length, appropriate reaction-time statistics, distribution, actual hand/provenance context if meaningful, hand-total setting and rule summary. No obsolete standalone hand-state selection field.
- Match current UI language; be readable on common phone displays and group chats.
- Permit saving/download and, where the device supports it, invoking native share behavior; provide download fallback.
- Never embed private stored history, email, account identifier, or invisible tracking data.
- Do not call the card verified or tamper-proof.

## 12. Challenge Link — confirmed Phase 1 feature

- Create a public-copyable URL usable on desktop and mobile, before or after a run.
- Restore question count, distribution, hand-total setting, rule profile and compatible generator/distribution versions; no obsolete hand-state selector. The recipient can choose their interface language independently.
- **Proposed preferred challenge flavor:** Same Seed, which reproduces the same ordered prompt sequence for fairer comparisons, including initial/continuing/insurance cases where applicable.
- Determinism requires a stable seeded pseudorandom generator, question-generator version, rule-profile version, and deterministic branch-free question selection, or an equivalent serialized task ID set. Store all necessary version fields in the link.
- Challenge links must validate input, reject unsupported versions gracefully, avoid secrets or personal results in parameters, and not allow unsafe arbitrary data loading.
- A no-backend MVP cannot centrally authenticate results, enforce unique identities, or provide an authoritative leaderboard.
- **Open design decision:** Should Same Seed be the default and Same Settings also be supported? Recommendation: Same Seed default, optional Same Settings later.

## 13. Storage, privacy, and deployment

- **Current Alpha:** sessions and settings are only in memory; reloading resets them. No accounts or backend.
- **Phase 1D target:** versioned local session/result persistence, safe migration, history summaries and confirmation-gated clear-history. Export/import may be deferred.
- Client-only app, suitable for static hosting such as GitHub Pages after review. Repository can be private during planning; publication/hosting will be arranged separately.
- Do not store secrets or private API keys in the client application.

## 14. Out of scope

- Wagers, bankroll strategy, real casino payouts/settlements, deposits or gambling links.
- Full hand resolution simulator, multiplayer rooms, cloud sync, global leaderboard, verified competitive identity.
- Persistent shoe through a whole table session, Hi-Lo running/true counts, deck estimation, betting counts, and index deviations.
- Arbitrary rule-profile editor and composition-dependent optimal-play engine.

## 15. Acceptance criteria and status

| Gate | Alpha status |
| --- | --- |
| 50-question Balanced Speed Run, final-only scoring | Implemented and tested |
| Practice immediate feedback and explanations | Implemented and tested |
| Reachable Initial/Continuing/Split provenance and legal actions | Implemented in generator/distribution; no separate mode selector |
| Deterministic versioned Balanced / Realistic | Implemented and tested |
| Independent reference strategy and fallback correctness | Implemented and tested |
| Dedicated Insurance prompt and reporting | Superseded; deferred to Casino Simulator |
| Hand-total toggle, hidden by default | Implemented; not persisted across reload |
| Accuracy and completed-run answer review | Implemented; median/P90, persistence and richer breakdowns pending |
| Pause/resume timing and cards hidden | Implemented; full real-device background acceptance pending |
| Manual Review and Weakness Drill | End-of-run review implemented; independent Weakness Drill pending |
| en-US / zh-TW and mobile portrait UI | Implemented; iOS Safari/Android real-device acceptance pending |
| PNG result card and Challenge Link | Pending Phase 1E |
| Session history across reload and reset-history confirmation | Pending Phase 1D |
| No private history in share outputs | Future release acceptance |

Reported checkpoint evidence: 412 tests at Phase 1C.4; 21 relevant UI tests, build/lint and desktop/mobile Chromium smoke checks at deployment preparation; maintainer opened the public site on a phone. See `TEST_PLAN.md`. A playable Alpha is **not** proof that every Phase 1 gate has passed.

## 16. Open decisions for future work

**Resolved for current Alpha:** React/Vite and GitHub Pages; Balanced prioritizes Hard/Soft/Pair coverage; Realistic uses natural actionable initial hands; internal Continuing/Split only where the Balanced policy permits; standalone Insurance/Even Money deferred; Speed Run default Balanced/50; hand total hidden by default; Seed retained as deterministic infrastructure.

**Still to design or verify:** final approval of provisional casino rules if new rule profiles are introduced; local history schema/version migrations and Weakness Drill sampling; richer reaction-time and decision-case analytics; PNG design; safe Same-Seed Challenge Link and potential Same Settings option; Advanced Seed UI and auto-generation; complete real-device and accessibility/privacy QA.

This document's future-facing requirements do not constitute product-owner approval to implement unresolved changes.
