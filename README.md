# Blackjack Training Lab

A mobile-friendly, bilingual (English / Traditional Chinese) Blackjack decision-training web app.

**Status (2026-11-20):** Playable Phase 1C Alpha, publicly available on GitHub Pages. The maintainer confirmed opening the site on a phone; this is **not** the completed Phase 1 release. Live source branch: `feature/phase1c-training-system`.

## Alpha Demo

The current app supports Practice with immediate strategy explanations and Speed
Run with 25/50/100 questions, final scoring, pause/resume and All/Incorrect/Correct
answer review. Both offer seeded Balanced and Realistic distributions, English
and Traditional Chinese, and optional hand totals (hidden by default). Balanced
is the default; Speed Run defaults to 50 questions.

### Live Alpha and deployment maintenance

**Live Alpha:** https://hfchen1006.github.io/blackjack-training-lab/

The maintainer confirmed opening this site on a phone on 2026-11-20. That establishes access on one real device, **not** completion of the full iOS Safari / Android Chrome acceptance checklist.

Deployment is controlled by [`.github/workflows/deploy-alpha-pages.yml`](.github/workflows/deploy-alpha-pages.yml):

1. **Settings → Pages → Build and deployment → Source** is **GitHub Actions**.
2. The `github-pages` environment allows `feature/phase1c-training-system` for deployment.
3. A push to that branch runs tests, lint and production build under `app/` with Node.js 24, then deploys `app/dist` through official GitHub Pages actions.
4. See **Actions → Deploy Alpha Demo to GitHub Pages** for build/deploy logs and **Settings → Pages → Visit site** for the live URL. Diagnose the earliest failed step if a future run fails.
5. Develop unfinished features on separate branches. Only merge reviewed changes into the Alpha branch; doing so triggers a new deployment even for documentation-only commits.

The repository is public. Do not commit private data, tokens, credentials or `.env` files. The Alpha is a static web app without accounts or a backend.

### Local production and mobile checks

From `app/`, with Node.js 24 and installed locked dependencies:

```sh
npm run test:ci
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/blackjack-training-lab/**, including the subpath.
Production HTML, JS and CSS use that prefix; `npm run dev` continues to serve at
`/`. On PowerShell, use `npm.cmd` if script policy blocks `npm.ps1`.

Local readiness verified on 2026-11-20 with Node.js 24.21.0: 21 relevant UI tests,
TypeScript/production build and ESLint passed. Production HTML, JS, CSS and
favicon returned HTTP 200 under the repository subpath. Desktop Chromium and
320/375/390px touch emulation passed, including six completed 25-question runs
across both distributions/languages, pause/resume, scoring and review filters.
Final asset/reload checks reported no browser errors or horizontal overflow.
The live Pages URL was opened on a phone by the maintainer. Comprehensive iOS Safari/Android QA, background/lock behavior and later workflow runs still require verification.

On a real phone, test the confirmed live URL in iOS Safari and Android Chrome:

- Try 320/375/390px-width layouts, portrait/landscape, scrolling, tapping and
  zooming. Check readable controls and no horizontal overflow or broken assets.
- In each language, launch both modes and both distributions. Practice should
  lock one answer and reveal feedback; Speed Run should reveal results only at
  completion. Check the result score and all three review filters.
- Pause/resume, background and return to the tab, and lock/unlock the phone.
  Confirm cards hide while paused, timing behaves correctly, and the current
  question survives language/total-visibility changes.
- Reload the subpath directly; confirm the app starts without a blank screen.
  Reloading starts fresh because progress is held only in memory.

Desktop Chromium touch emulation is useful local smoke coverage, but does not
establish actual Safari, iPhone/Android hardware, low-end performance or mobile
OS background behavior. Record those checks separately before broader sharing.

### Known Alpha limitations

Sessions and settings are in memory; reloads and switching training modes reset
progress. The supported rule profile is fixed, with provisional casino defaults
as noted below. Realistic samples fresh actionable initial deals per question,
not a persistent shoe or full casino simulation. Balanced variety is best effort;
bounded generation can fail and offers one extended retry. Standalone Insurance
and Even Money prompts are absent from the main training UI. There is no account,
backend, analytics, persistent history, Weakness Drill, card counting, share image
or Challenge Link implementation. The broader feature list below is the product
plan, not a claim that all Phase 1 features are playable.

## Product goal

Train Basic Strategy accuracy and reaction time, identify weak decisions, and share friendly speed challenges with other players. Future phases may add Hi-Lo card counting, true-count conversion, index deviations, and fuller table simulation.

## Feature status

**Playable now — Phase 1C Alpha:**

- Practice: one-answer lock, immediate feedback, correct action and concise explanation.
- Speed Run: 25/50/100 questions (default 50), final-only scoring, pause/resume, response timing, All/Incorrect/Correct review filters and Perfect Run messaging.
- Deterministic seeded Balanced / Realistic distribution (Balanced default). [Implementation policy](docs/TRAINING_DISTRIBUTIONS.md).
- Balanced includes legal Initial/Continuing/Split provenance internally; Realistic shows actionable Initial hands only. **No separate hand-state selector**.
- English and Traditional Chinese UI, accessible touch/keyboard controls, hidden-by-default player hand total.
- Fixed six-deck S17/DAS baseline; other table settings remain provisional.

**Planned within Phase 1:**

- **Phase 1D:** persisted local session history, richer performance/decision-situation analysis, full Manual Review and independent Weakness Drill.
- **Phase 1E:** PNG result sharing, versioned Same-Seed Challenge Link, automatically generated Seed with optional custom input under Advanced Settings, focused UI/UX improvements.
- **Release QA:** complete iOS Safari/Android and accessibility testing, privacy and challenge validation, final release acceptance.

**Deferred:** dedicated Insurance/Even Money training UI, full casino table progression, card counting and index deviations. Insurance/Even Money domain logic still exists for future use.

The list of [planned milestones](docs/BACKLOG.md) is distinct from what is playable today.

## Default rules (partly provisional)

Six decks, dealer stands on soft 17 (S17), double after split allowed (DAS), no surrender, American dealer peek, 3:2 natural blackjack payout. **Only S17 and the use of DAS as a chosen default have been explicitly settled; see the decisions log for the remaining provisional assumptions.**

## Project documents

- [Phase 1 MVP Specification](docs/PHASE1_MVP_SPEC.md)
- [Requirements & decision log](docs/DECISIONS.md)
- [Development backlog](docs/BACKLOG.md)
- [Acceptance tests and remaining QA](docs/TEST_PLAN.md)
- [Implemented distribution policy](docs/TRAINING_DISTRIBUTIONS.md)

## Development setup

The app uses React, TypeScript, Vite and Vitest in `app/`. Run `npm ci` there with
Node.js 24, then `npm run dev`. See [the foundation guide](docs/PHASE1A_FOUNDATION.md)
for command details and [the distribution policy](docs/TRAINING_DISTRIBUTIONS.md)
for current question selection behavior. The Alpha section above describes the
implemented scope; requirements documents retain the broader plan.

## Sharing and privacy

The current Alpha does not persist completed sessions, create challenge links, or generate result images. Future shareable URLs and PNG cards must exclude private local history, emails, private notes and tracking data. With no backend, results cannot be authenticated for a trusted leaderboard.

## Disclaimer

This is an educational practice app, not a gambling prediction or guaranteed-win system. Correct strategy depends on the selected rules and scoring model.
