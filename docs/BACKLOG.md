# Development Backlog (Draft)

These items are **not started**. Order is a recommendation for implementation in small, reviewable batches.

## P0 — Foundation and correctness

- [ ] B-01 Confirm pending rules and exact question/insurance counting convention.
- [ ] B-02 Choose frontend stack, project scripts, and quality tooling.
- [ ] B-03 Define versioned RuleProfile, Card, Shoe, HandState, DecisionPrompt, Result, Session schemas.
- [ ] B-04 Implement and independently test legal-action detection and Basic Strategy oracle.
- [ ] B-05 Implement versioned deterministic seeded prompt generator, Balanced and Realistic.
- [ ] B-06 Implement Insurance prompt stage, its scoring and any Even Money extension.

## P0 — Phase 1 user flows

- [ ] B-07 Responsive Setup / Training / Session Report screens.
- [ ] B-08 Practice feedback, explanations, reference strategy view.
- [ ] B-09 Speed Run timing, pause/loss-of-focus handling, shortcuts, duplicate-submission prevention.
- [ ] B-10 Initial, Continuing, Mixed categories and category-specific statistics.
- [ ] B-11 Store completed sessions locally, with versioned prompt results.
- [ ] B-12 Manual Review and Weakness Drill, independent scoring.

## P0 — Sharing and accessibility

- [ ] B-13 Full en-US and zh-TW locale coverage and persistence.
- [ ] B-14 Mobile responsive layout and keyboard/touch accessibility.
- [ ] B-15 Share as Image PNG rendering, download, and native-share fallback.
- [ ] B-16 Challenge Link generation, validation, restoration, Same Seed reproducibility.

## P1 — Release quality

- [ ] B-17 Automated unit, property, integration, and browser acceptance tests.
- [ ] B-18 Verify challenge equivalence across mobile/desktop and languages.
- [ ] B-19 Privacy/content review; handling of stale or invalid challenge URLs.
- [ ] B-20 Manual review of all modes and actual mobile Safari/Chrome smoke tests.
- [ ] B-21 Document deploy configuration and release static site.

## Deferred after Phase 1

- [ ] Export/import local history backups.
- [ ] Optional Same Settings challenge mode if not included initially.
- [ ] Additional custom casino rule presets and advanced split continuations.
- [ ] Phase 2 Hi-Lo, Running/True Count, deck estimation.
- [ ] Phase 3 Index Deviations.
- [ ] Phase 4 full casino/table simulation.

## Definitions

- **Ready:** requirements and test cases approved, dependencies identified.
- **Done:** reviewed code, automated tests, accessibility checks, and relevant browser tests pass.
- Avoid building UI around an unverified strategy oracle.
