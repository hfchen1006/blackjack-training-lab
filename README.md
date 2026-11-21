# Blackjack Training Lab

A mobile-friendly, bilingual (English / Traditional Chinese) Blackjack decision-training web app.

**Status:** Phase 1C Alpha application implemented. GitHub Pages deployment preparation is available; a live deployment has not been confirmed.

## Alpha Demo

The current app supports Practice with immediate strategy explanations and Speed
Run with 25/50/100 questions, final scoring, pause/resume and All/Incorrect/Correct
answer review. Both offer seeded Balanced and Realistic distributions, English
and Traditional Chinese, and optional hand totals (hidden by default). Balanced
is the default; Speed Run defaults to 50 questions.

### Enable and publish with GitHub Pages

These are manual steps after independent review; preparation does not publish
the site or change repository settings.

1. In `hfchen1006/blackjack-training-lab`, open **Settings → Pages → Build and
   deployment → Source** and select **GitHub Actions**. Do not select a publishing
   branch or generate an additional workflow. Pages must be available under the
   repository's current visibility and plan; if unavailable, resolve that with
   the owner without changing visibility as part of this task.
2. In **Settings → Actions → General**, ensure Actions and the official `actions/*`
   used by the workflow are permitted by repository/organization policy. No PAT,
   custom secret, or repository-wide write-token setting is required.
3. In **Settings → Environments → github-pages**, create the environment if
   necessary. Under **Deployment branches and tags**, choose **Selected branches
   and tags** and add a **Branch** rule for exactly
   `feature/phase1c-training-system`. Preserve any required reviewers; approve a
   deployment when prompted. A restriction to `main` would block this Alpha.
4. After review, the maintainer must commit the approved local changes and push
   **only** `feature/phase1c-training-system`. The workflow
   `.github/workflows/deploy-alpha-pages.yml` runs on pushes to that branch only;
   no merge into `main`, manual-dispatch workflow, or `gh-pages` branch is needed.
5. Open **Actions → Deploy Alpha Demo to GitHub Pages**, selecting the feature
   branch if needed. Verify both **build** and **deploy** jobs succeed. Build runs
   Node.js 24, `npm ci` against `app/package-lock.json`, tests, lint and the
   production build in `app/`; only `app/dist` is uploaded. Deploy uses the
   built-in GitHub token with Pages/OIDC permissions, not external credentials.
6. The expected URL is
   **https://hfchen1006.github.io/blackjack-training-lab/** (without a custom
   domain). Verify the actual URL in the successful run's **github-pages**
   environment link and **Settings → Pages → Visit site**. Then smoke-test that
   live URL separately; local verification does not confirm GitHub deployment.

If a job fails, open its first failed step and logs. Install/test/lint/build
errors belong to **build**. A missing Pages site requires step 1; deployment
branch protection requires step 3; a waiting job may need reviewer approval.
After fixing settings, use the failed run's **Re-run failed jobs** (or **Re-run
all jobs** if its short-lived artifact expired). After a code correction, push
the reviewed correction to the same feature branch. Workflow discovery in the
sidebar is not required for the initial push-triggered run.

This follows [GitHub's custom Pages workflow setup](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [deployment environment rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

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
The GitHub workflow, live site and real-phone/Safari behavior remain unverified.

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

## Phase 1 features

- Practice with immediate strategy feedback.
- Speed Run with end-of-session feedback, default 50 decision prompts.
- Balanced or Realistic question distribution.
- Initial Only, Continuing Hands, and Mixed categories; independent reporting.
- Optional hand-total display, hidden by default.
- Insurance decisions; even-money handling proposed for relevant hands.
- Session report, manual review, and Weakness Drill.
- Responsive mobile/desktop experience.
- English and Traditional Chinese across all user-facing text.
- Share as Image: one shareable PNG results card.
- Challenge Link: link-based, repeatable challenge configuration and deterministic questions where enabled.
- Local-first session data; no account or backend required for the MVP.

## Default rules (partly provisional)

Six decks, dealer stands on soft 17 (S17), double after split allowed (DAS), no surrender, American dealer peek, 3:2 natural blackjack payout. **Only S17 and the use of DAS as a chosen default have been explicitly settled; see the decisions log for the remaining provisional assumptions.**

## Project documents

- [Phase 1 MVP Specification](docs/PHASE1_MVP_SPEC.md)
- [Requirements & decision log](docs/DECISIONS.md)
- [Development backlog](docs/BACKLOG.md)
- [Proposed acceptance tests](docs/TEST_PLAN.md)

## Development setup

The app uses React, TypeScript, Vite and Vitest in `app/`. Run `npm ci` there with
Node.js 24, then `npm run dev`. See [the foundation guide](docs/PHASE1A_FOUNDATION.md)
for command details and [the distribution policy](docs/TRAINING_DISTRIBUTIONS.md)
for current question selection behavior. The Alpha section above describes the
implemented scope; requirements documents retain the broader plan.

## Sharing and privacy

A challenge link should never contain browser history, private notes, or other personal data. A result image can optionally show a user-entered nickname. Without a server, results cannot be verified against tampering; this feature is intended for friendly challenges, not a trusted leaderboard.

## Disclaimer

This is an educational practice app, not a gambling prediction or guaranteed-win system. Correct strategy depends on the selected rules and scoring model.
