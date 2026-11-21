# Development Backlog — Phase 1C Alpha Status

Last synchronized: **2026-11-20**, against `feature/phase1c-training-system`. The public GitHub Pages **Alpha is live**, but the full Phase 1 release is not yet complete.

This document retains original B-01–B-21 IDs. **Done** is limited to the stated Alpha scope; **Partial** means original acceptance is not yet fully achieved. A checkbox `[x]` means delivered for the stated scope, not that all future features are done.

## Milestones delivered

| Milestone | Status | Scope |
| --- | --- | --- |
| Phase 1A | Done | React/TypeScript/Vite, i18n scaffold, tests/tooling |
| Phase 1B | Done | Rule engine, Basic Strategy, decision adapter |
| Phase 1C.1 | Done | Deterministic six-deck question generator and golden tests |
| Phase 1C.2 / 1C.3 | Done | Practice, Speed Run, result filters, recovery, mobile-responsive UI |
| Phase 1C.4 | Done | Balanced/Realistic, versioned distributions and tests |
| GitHub Pages Alpha | Live | Maintainer confirmed that website opens on a phone |

Codex reported **412 tests passed** at 1C.4 and the deployment preparation reported **21 relevant UI tests**, successful build/lint and desktop/mobile Chromium emulation. These are prior checkpoint reports, not tests rerun during this documentation update. Full hardware Safari/Android QA remains pending.

## P0 — Foundation and correctness

- [ ] **B-01 — Partial:** S17 confirmed; DAS accepted. Other fixed casino defaults remain provisional. Separate Insurance prompt convention was superseded by deferral.
- [x] **B-02 — Done:** Frontend stack, scripts and quality tooling.
- [ ] **B-03 — Partial:** Versioned rules/card/question/distribution models exist; persistent session/history schema is still pending.
- [x] **B-04 — Done:** Legal actions, Basic Strategy and independent reference coverage.
- [x] **B-05 — Done:** Seeded generator and Balanced/Realistic distribution policies (`question-generator-v1`, `training-distribution-v1`).
- [ ] **B-06 — Deferred:** Dedicated Insurance/Even Money UI prompts moved to future Casino Simulator. Underlying domain support preserved.

## P0 — User flows

- [x] **B-07 — Done for Alpha:** Responsive Setup, Training and Speed Run report UI.
- [ ] **B-08 — Partial:** Practice feedback and explanations implemented; a standalone strategy-reference view is not yet available.
- [x] **B-09 — Done for Alpha:** Timing, pause/resume, loss-of-focus handling, keyboard shortcuts and answer-submission guards.
- [ ] **B-10 — Rescoped/Partial:** Balanced mixes Initial/Continuing/Split internally; Realistic is Initial only. Standalone selectors were removed; category/provenance statistics remain planned.
- [ ] **B-11 — Pending (1D):** Versioned completed-session records in local browser storage.
- [ ] **B-12 — Partial (1D):** End-of-run review works; persisted Manual Review and independent Weakness Drill remain pending.

## P0 — Sharing and accessibility

- [ ] **B-13 — Partial:** en-US / zh-TW supported; preference persistence across reload is not yet delivered.
- [x] **B-14 — Done for Alpha:** Responsive touch and keyboard UI; actual device acceptance tracked under B-20.
- [ ] **B-15 — Pending (1E):** PNG Share as Image and save/share fallback.
- [ ] **B-16 — Pending (1E):** Version-safe Same-Seed Challenge Link with restoration and validation.

## P1 — Release quality

- [ ] **B-17 — Partial:** Unit/integration and Chromium smoke coverage exist; complete browser, accessibility, local-history and sharing acceptance pending.
- [ ] **B-18 — Pending:** Cross-device/language challenge equivalence once Challenge Link exists.
- [ ] **B-19 — Partial:** Initial accessible Git-history inspection found no obvious credentials. Sharing payload/privacy review still pending.
- [ ] **B-20 — Partial:** Desktop and 320/375/390px simulated mobile Chromium checked; maintainer opened live site on a phone. Full real Safari/Android checklist pending.
- [ ] **B-21 — Partial:** Alpha deployed to GitHub Pages. Final release acceptance and documentation pending.

## Next development sequence (planned, not newly approved implementation)

1. **Phase 1D — Learning & Progress:** local session storage schema/versioning, restore/clear history, decision-situation statistics, richer Manual Review, separately scored Weakness Drill.
2. **Phase 1E — Sharing & UX:** bilingual result PNG and share fallback, Same-Seed Challenge Link, optional custom Seed in Advanced Settings with auto-generated ordinary seeds, targeted UI/UX refinement.
3. **Phase 1 Release QA:** mobile Safari/Android, accessibility, challenge equivalence, privacy and final release criteria.

Maintain a stable live Alpha on `feature/phase1c-training-system`; use a separate development branch for unfinished next-phase work and merge only after review.

## Deferred after Phase 1

- History export/import and optional Same Settings challenge mode.
- Advanced rule presets and extra split continuations.
- Phase 2: Hi-Lo, running and true count, deck estimation.
- Phase 3: counting index deviations.
- Phase 4: full casino simulator and deferred side-decision drills.

**Status convention:** Done = delivered for stated scope; Partial = incomplete original requirements or release QA; Pending = unimplemented; Deferred/Superseded = moved or changed by later product decisions.
