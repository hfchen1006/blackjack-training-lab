# Phase 1A foundation

This guide supplements the existing requirements, decisions, test plan, backlog,
and READMEs. Those documents are preserved. Phase 1A establishes infrastructure
only; the full Phase 1 acceptance criteria remain future work.

## Local development

Run commands from `app/` with Node.js 24 LTS and npm (verified with Node
24.21.0 and npm 11.19.0). Install locked dependencies with `npm ci`.
On Windows PowerShell, use `npm.cmd` if script policy blocks `npm.ps1`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite development server |
| `npm run build` | TypeScript project checks and production bundle |
| `npm run lint` | ESLint checks |
| `npm run test` | Vitest, with watch mode during interactive development |
| `npm run test:ci` | One test run that exits, suitable for CI |
| `npm run preview` | Local preview of an existing production bundle |

No deployment workflow or CI service is introduced in this phase. The future CI
quality gate can run `npm ci`, `npm run build`, `npm run lint`, and
`npm run test:ci` in `app/`.

## Source structure

```text
app/
  src/
    main.tsx
    index.css
    app/
      App.tsx
      App.css
    i18n/
      locale.ts
      locale.test.ts
      messages.ts
    modules/
      blackjack/.gitkeep
      strategy/.gitkeep
      training/.gitkeep
      sessions/.gitkeep
      challenges/.gitkeep
    shared/
      ui/.gitkeep
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  eslint.config.js
```

The `.gitkeep` files reserve future module directories; they contain no business
logic or speculative schemas. Remove a marker when adding that module's files.

| Location | Responsibility |
| --- | --- |
| `src/app` | React application shell, future screens, browser integration |
| `src/modules/blackjack` | Future rule profiles, card and hand-state models, legal actions |
| `src/modules/strategy` | Future Basic Strategy evaluation using explicit rules and hand state |
| `src/modules/training` | Future training modes, question generation, seeded random generation |
| `src/modules/sessions` | Future session result records and statistical calculations |
| `src/modules/challenges` | Future challenge configuration validation and URL serialization |
| `src/i18n` | Supported locales, pure locale selection, presentation text |
| `src/shared/ui` | Future reusable React presentation components |

Business modules should remain plain TypeScript, with no React, DOM, browser
storage, or localized copy dependencies. Pass required values explicitly. The
application shell should translate labels and perform browser integration.
Future training can compose blackjack and strategy functions; challenges can
serialize versioned training configuration. No persistence adapter, seeded
algorithm, or strategy implementation is selected here.

Use direct relative imports and colocate `*.test.ts` files with pure functions.
Introduce shared utilities or components only after a real reuse case exists.
No router, state management library, path aliases, i18n package, or generic
repository/service layer is needed for this placeholder.

## Implemented foundation

- The responsive placeholder displays the project name and development status;
  there are no gameplay controls.
- Placeholder copy is available in English and Traditional Chinese. At startup,
  the first supported browser language preference selects the text and document
  language. English variants map to `en-US`; `zh-TW` and explicit `zh-Hant`
  variants map to `zh-TW`. Unsupported languages fall back to English.
- Locale selection is a pure function. Tests cover preference order, supported
  variants, case handling, unsupported languages, and empty preferences.
- Translation keys are checked with TypeScript for both supported locales.
- TypeScript strict mode applies to source and tool configurations.
- Vitest uses an explicit Node environment and imported test APIs. Its separate
  configuration avoids loading React plugins for pure unit tests and is included
  in the TypeScript build. DOM testing dependencies are deferred.
- `vitest` is the only added direct dependency, and is development-only. The npm
  cache used during setup, dependencies, and generated bundles are ignored.

The manual language selector and saved locale preference are deferred to a future
UI task. This placeholder does not claim full Phase 1 localization acceptance.

## Baseline verification

- Branch: `feature/phase1-foundation`.
- Initial Git status: `?? app/` (the supplied application was already untracked).
- Read the root and app READMEs and all existing documents in `docs/`.
- Inspected Vite, both TypeScript projects, and the ESLint configuration.
- `npm.cmd run build`: passed (TypeScript plus Vite).
- `npm.cmd run lint`: passed.
- No pre-existing application check failures were found.

Environment issues were worked around without system setting changes:
PowerShell blocked `npm.ps1`, so commands use `npm.cmd`; Git's sandbox ownership
check required per-command `git -c safe.directory=D:/blackjack-training-lab ...`.
The sandbox blocked the initial npm registry request; the authorized Vitest
installation used a network permission escalation and a project-local cache.

## Remaining decisions and next task

The existing specification still contains proposed rule settings, question
sampling decisions, Insurance counting conventions, and challenge-versioning
decisions. This infrastructure work does not resolve or implement them.

Suggested next task, after approval: confirm pending rule-profile choices and
specify versioned Card, RuleProfile, and HandState contracts with independent
acceptance fixtures. Then implement the smallest rules utility with unit tests
before building training screens or the Basic Strategy engine.

Stop at Phase 1A. No Insurance, gameplay, card counting, deployment, commits,
pushes, or pull requests are part of this work.

## Final verification results

All commands below ran from `D:\blackjack-training-lab\app` and exited with code 0:

| Exact command | Result |
| --- | --- |
| `npm.cmd run build` | Passed TypeScript project checks and Vite production build |
| `npm.cmd run lint` | Passed with no findings |
| `npm.cmd run test:ci` | Passed: 1 test file, 16 tests |
| `npm.cmd run test -- --run` | Passed: 1 test file, 16 tests; verifies the default test script |
| `npm.cmd ls --depth=0` | All direct dependencies resolved; no invalid/missing packages |

Local Chrome smoke checks passed for English at 1280x800 and 375x812, and
Traditional Chinese at 1280x800 and 320x740. Each case checked the title, heading,
development status, document language, absence of buttons, and absence of
horizontal overflow. There were zero JavaScript exceptions. Desktop and narrow
mobile screenshots were also visually inspected. These checks used a temporary
Node/CDP script and screenshots inside the ignored `app/.npm-cache/` directory;
no browser test dependency was added. Real-device Safari testing remains future
acceptance work.

SHA-256 checks confirmed both original READMEs and all four original `docs/`
files are unchanged. Git still has the original untracked `app/` plus this new
guide; no changes were staged or committed.

## Changed files relative to the supplied application

Updated:

- `app/.gitignore` (ignore the project-local setup cache)
- `app/package.json` (test scripts and development-only Vitest dependency)
- `app/package-lock.json` (resolved test dependencies)
- `app/eslint.config.js` (ignore the local setup cache)
- `app/index.html` (project title and description; remove template favicon)
- `app/tsconfig.app.json` (strict mode)
- `app/tsconfig.node.json` (strict mode and Vitest configuration checks)
- `app/src/main.tsx` (application shell and startup locale selection)
- `app/src/index.css` (minimal global styles)

Added:

- `app/vitest.config.ts`
- `app/src/app/App.tsx`
- `app/src/app/App.css`
- `app/src/i18n/locale.ts`
- `app/src/i18n/locale.test.ts`
- `app/src/i18n/messages.ts`
- `app/src/modules/blackjack/.gitkeep`
- `app/src/modules/strategy/.gitkeep`
- `app/src/modules/training/.gitkeep`
- `app/src/modules/sessions/.gitkeep`
- `app/src/modules/challenges/.gitkeep`
- `app/src/shared/ui/.gitkeep`
- `docs/PHASE1A_FOUNDATION.md` (this guide)

Removed unused Vite demo files:

- `app/src/App.tsx`
- `app/src/App.css`
- `app/src/assets/hero.png`
- `app/src/assets/react.svg`
- `app/src/assets/vite.svg`
- `app/public/favicon.svg`
- `app/public/icons.svg`

The existing `app/vite.config.ts`, `app/tsconfig.json`, and `app/README.md` were
inspected and preserved. Generated `dist/`, `node_modules/`, and `.npm-cache/`
contents are ignored, and are not source deliverables.

The local Vite smoke-check server was stopped and the temporary Chrome profile
was removed. Vite emitted temporary `EBUSY` watcher warnings while Chrome held
profile files open inside the cache; removing that profile resolved the source
of those warnings. No production build, lint, or unit-test failures occurred.
