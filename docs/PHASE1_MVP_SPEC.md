# Blackjack Training Lab — Phase 1 MVP Specification

- **Version:** 0.2 (review draft)
- **Date:** 2026-11-20
- **Owner:** User / product owner
- **Status:** Draft for review; **not** approval to implement application code
- **Delivery target:** Responsive static web app, local-first
- **Languages:** English (en-US) and Traditional Chinese (zh-TW)

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
- Strategy reference accessible without losing work.
- Optional category filtering and adaptive question selection are proposed.

### 4.2 Speed Run

- Default: **50 scored decision prompts**. Proposed quick options: 25 / 50 / 100.
- Distribution selected before each run: **Balanced** or **Realistic**.
- Hand state selected before each run: **Initial Only**, **Continuing Hands**, **Mixed**.
- No correctness feedback during the run; a report follows completion.
- No mandatory time limit by default. Time each decision independently.
- Hand total is toggleable, **hidden by default**; record this setting with results.
- Provide progress and pause / resume / exit controls.

### 4.3 Hand-state definitions

- **Initial:** a legal first-decision state with a two-card player hand, including pairs and soft totals. Usual legal choices: Hit / Stand / Double / Split, depending on rules.
- **Continuing:** a reachable subsequent decision **after at least one Hit** with its action history retained. Generally Hit / Stand; do not offer Double or Split after a hit in the default profile.
- **Mixed:** includes Initial and Continuing, with separate subtotals and one aggregate. Proposed starting mix: 50:50 before any Insurance prompts.
- A later phase may add continuing turns **after split**, as those states have additional restrictions and are not necessarily synonymous with post-Hit hands.

A prompt equals **one scored decision**, not one complete blackjack round. Initial prompts do not have to play out to resolution in Phase 1.

## 5. Insurance and even money

Insurance belongs in Phase 1 as an **explicit decision type** shown when dealer's upcard is Ace, prior to dealer peek. In a standard non-counting Basic Strategy evaluation, the expected correct insurance decision is **Decline**, regardless of the player's main-hand strategy. Count-based Insurance indices belong to later advanced phases.

Even Money for a player natural against dealer Ace is a closely related **proposed** edge case; whether to include it as a distinct prompt must be confirmed before implementation. It should not be mislabeled as an ordinary Hit/Stand decision.

For reporting, insurance decisions should have their own category; they must not inflate Hard/Soft/Pair strategy mastery. **Proposed counting convention:** a 50-question run consists of 50 decision prompts in total, including any insurance decision prompts. Their proportion in Balanced mode is TBD and must be explicit. Realistic mode should use rule-consistent triggering frequencies.

## 6. Question-generation contracts

### Balanced

- Use predetermined, versioned strata to cover strategy-relevant Hard, Soft, Pair, and decision-state categories.
- For Mixed, sample both Initial and Continuing, and report each separately.
- Avoid excessive repetition of identical decision situations within a run where possible.
- Preserve a known distribution definition for cross-session comparison; store its version.

### Realistic

- Sample values from a finite six-deck composition, not uniformly from ranks or strategy cells.
- Reachable Continuing states must be generated using a legal sequence of deals and preceding actions; reject impossible or already-terminated states.
- A **fresh shoe per prompt** is an acceptable Phase 1 sampling model, clearly labeled. Persistent shoe depletion is deferred to card-counting simulation.
- Never draw more instances of a rank or card than the shoe contains.

### Scoring and rule fidelity

- Derive legal actions from current state.
- Handle player blackjack, bust, dealer peek, and insurance stages explicitly.
- No ordinary action choices on a finished hand.
- Test reference decisions for edge cases, including conditional Double/Split possibilities and S17 interactions.
- A disabled Double option must not turn the answer into an automatic mistake; the engine needs the correct fallback action for that specific rule/state.

## 7. User interface and accessibility

### Setup screen

Select training type; question count; distribution; hand category; show/hide total; and read a compact rule summary. The interface language is separately changeable at any point.

### Training screen

Dealer upcard above, hidden card when applicable, player cards below, visible progress, accessible decision buttons. Keyboard shortcuts on desktop: H = Hit, S = Stand, D = Double, P = Split. Insurance stage uses explicit Take / Decline controls; avoid accidental shortcut collisions.

- Ignore keyboard auto-repeat so one keypress cannot answer multiple consecutive prompts.
- During pause or loss of focus, hide the cards and suspend the timer.
- Begin timing when the rendered prompt is ready; end when a valid choice is recorded.
- Prevent pointer/keyboard double-submission during transitions.
- No lengthy forced deal animations. Proposed next-question delay: ~300 ms.
- Ensure keyboard navigation, screen-reader labels, touch target sizes, and color-independent correctness indicators.

### Session report and review

Show accuracy (correct / attempted), median time, P90 time, fastest time (descriptive only), and splits by Initial/Continuing and Hard/Soft/Pair/Insurance as applicable. Keep accuracy and speed separate. Review a prompt with cards, legal actions, user action, reference action, rule profile, timing, and concise explanation.

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
- Default language can follow the browser locale; a manual switch overrides it and remains available.
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
- Include optional user-supplied nickname; accuracy (with numerator/denominator), session length, median reaction time, fastest time, training distribution, hand-state mode, show/hide total, and relevant rule summary.
- Match current UI language; be readable on common phone displays and group chats.
- Permit saving/download and, where the device supports it, invoking native share behavior; provide download fallback.
- Never embed private stored history, email, account identifier, or invisible tracking data.
- Do not call the card verified or tamper-proof.

## 12. Challenge Link — confirmed Phase 1 feature

- Create a public-copyable URL usable on desktop and mobile, before or after a run.
- Restore question count, distribution, hand-state mode, show/hide total, and the rule profile. The recipient can choose their interface language independently.
- **Proposed preferred challenge flavor:** Same Seed, which reproduces the same ordered prompt sequence for fairer comparisons, including initial/continuing/insurance cases where applicable.
- Determinism requires a stable seeded pseudorandom generator, question-generator version, rule-profile version, and deterministic branch-free question selection, or an equivalent serialized task ID set. Store all necessary version fields in the link.
- Challenge links must validate input, reject unsupported versions gracefully, avoid secrets or personal results in parameters, and not allow unsafe arbitrary data loading.
- A no-backend MVP cannot centrally authenticate results, enforce unique identities, or provide an authoritative leaderboard.
- **Open design decision:** Should Same Seed be the default and Same Settings also be supported? Recommendation: Same Seed default, optional Same Settings later.

## 13. Storage, privacy, and deployment

- Browser-local persistence, no accounts; data scoped to browser/device.
- Store per-prompt results and session configuration/version, plus history summaries.
- Provide a clear reset-history action with confirmation. Export/import backup can be Phase 1.1 unless separately approved.
- Client-only app, suitable for static hosting such as GitHub Pages after review. Repository can be private during planning; publication/hosting will be arranged separately.
- Do not store secrets or private API keys in the client application.

## 14. Out of scope

- Wagers, bankroll strategy, real casino payouts/settlements, deposits or gambling links.
- Full hand resolution simulator, multiplayer rooms, cloud sync, global leaderboard, verified competitive identity.
- Persistent shoe through a whole table session, Hi-Lo running/true counts, deck estimation, betting counts, and index deviations.
- Arbitrary rule-profile editor and composition-dependent optimal-play engine.

## 15. Acceptance criteria

1. 50-prompt Balanced Speed Run completes with no intermediate answer reveal and produces a report.
2. Practice reports immediate feedback and explanations; Speed Run does not.
3. Initial / Continuing / Mixed generate only reachable, correctly labeled legal decision states; category metrics remain separate.
4. Balanced and Realistic honor their documented, versioned distributions.
5. Rule-profile reference cases pass independent strategy checks, including no Double after Hit.
6. Dealer Ace triggers Insurance correctly, with separate answer choices and separate reporting.
7. A visible/hidden hand-total toggle works, defaults to hidden, and is saved with session results.
8. Median, P90, accuracy, and per-category breakdowns agree with saved prompt records.
9. Pause / loss of focus does not inflate timed response duration or expose cards.
10. Manual Review and user-initiated Weakness Drill work, with independent scores.
11. English and zh-TW all flow end-to-end, including feedback, empty/error states, sharing, and accessible labels.
12. Mobile portrait layout works without horizontal overflow; touch and keyboard cannot double-submit.
13. PNG results card matches the actual saved result and is usable on mobile/desktop with fallback download.
14. Challenge URL reopens with the same settings on a separate device; Same Seed challenge reproduces a byte-for-byte equivalent ordered question descriptor list when generator versions match.
15. Invalid / stale challenge URL fails safely with a friendly explanation and does not erase local history.
16. After reload, finished session history is still accessible (assuming site storage has not been cleared).
17. No credential, private record, or uncontrolled local history is included in a shareable challenge URL/image.

## 16. Pre-implementation open decisions

- Final values for still-proposed table rules; coverage and legal-action constraints for split aces.
- Exact Balanced strata, Realistic sample mechanics, and Insurance prompt quota / denominator.
- Distinction and UI for Even Money.
- Default Practice distribution and Mixed ratio.
- Share card layout, optional nickname and image dimensions.
- Same Seed as default vs optional Same Settings.
- Framework choice, deployment workflow, and explicit supported browser versions.

No application coding should start until the product owner accepts these open decisions or explicitly delegates sensible defaults.
