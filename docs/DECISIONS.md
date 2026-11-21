# Requirements & Decision Log

Last synchronized: **2026-11-20** (public Phase 1C Alpha).

Status meanings: **Confirmed** = explicit product decision; **Default** = currently adopted without claiming casino universality; **Proposed** = not yet approved; **Superseded** = historical decision replaced; **Deferred** = moved beyond the current training UI.

| ID | Decision | Status |
| --- | --- | --- |
| D-01 | Phase 1 emphasizes Basic Strategy speed/accuracy; card counting later | Confirmed |
| D-02 | Practice shows immediate feedback; Speed Run reviews at the end | Confirmed / Implemented |
| D-03 | Dealer stands on soft 17 (S17) | Confirmed / Implemented |
| D-04 | DAS is allowed by default | Accepted default / Implemented |
| D-05 | Six decks, no surrender, American peek, 3:2 natural payout | Provisional defaults; not all explicitly approved |
| D-06 | Choose Balanced or Realistic before Practice / Speed Run | Confirmed / Implemented |
| D-07 | Balanced + 50 questions as the default Speed Run | Confirmed / Implemented |
| D-08 | Hand-total toggle, hidden by default | Confirmed / Implemented |
| D-09 | Original standalone Initial / Continuing / Mixed selection and separate stats | **Superseded by D-18–D-20** |
| D-10 | Manual Review and independent Weakness Drill in Phase 1 | Confirmed; final-run review implemented, Weakness Drill pending |
| D-11 | Original requirement for separate Insurance prompts in Phase 1 | **Superseded by D-20** |
| D-12 | Even Money as dedicated training prompt | Deferred; domain logic preserved |
| D-13 | English and Traditional Chinese UI | Confirmed / Implemented; persistence pending |
| D-14 | Responsive web app to share with friends | Confirmed / Alpha live |
| D-15 | Share as Image PNG and Challenge Link belong to Phase 1 | Confirmed; Phase 1E pending |
| D-16 | Same-Seed as preferred future challenge style | Proposed default; deterministic Seed system already implemented |
| D-17 | No accounts, backend or verified leaderboard in Phase 1 | Current static/local-first scope |
| D-18 | Balanced favors approximately equal Hard / Soft / exact-rank Pair coverage, not higher difficulty weights | Confirmed / Implemented |
| D-19 | Realistic uses naturally dealt **actionable initial hands only**; full sequences reserved for simulator | Confirmed / Implemented |
| D-20 | No main-UI standalone hand-state, Insurance or Even Money selectors; Balanced may mix reachable Continuing/Split internally | Confirmed / Implemented; underlying domain support retained |
| D-21 | Keep deterministic Seed long-term; later auto-generate standard seeds and move optional custom Seed entry to Advanced Settings | Confirmed product direction; **UI still pending** |
| D-22 | Publish public GitHub Pages Alpha from `feature/phase1c-training-system` | Approved action / Live; maintainer opened on phone |

## Implemented distribution and limitations

- **Balanced:** deterministic near-equal Hard/Soft/Pair quotas. The versioned roughly 80/15/5 Initial/Continuing/Split provenance schedule is a **provisional engineering policy**, not learning-science proof.
- **Realistic:** fresh six-deck sampling per prompt, actionable initial hands only, no category quotas and no persistent-shoe simulation.
- Side decisions remain available in underlying engine/generator but are intentionally absent as standalone visible drills.
- Current Speed Run reports accuracy, correct/incorrect counts, elapsed/average response time and end-of-run answer filtering; persistent history and richer statistics are not yet implemented.
- Public Alpha is not a full Phase 1 release. All not-explicitly-approved casino rules remain provisional.

## Open design/QA decisions

- Confirm remaining provisional rule settings if user-configurable profiles are introduced.
- Phase 1D local storage schema/version migration, clear-history behavior and Weakness Drill sampling.
- Phase 1E PNG layout, Challenge Link version validation and optional Same Settings style.
- Final iOS Safari/Android QA and accessibility/privacy release gate.

**Historical traceability:** D-09 and D-11 remain in the log as superseded; do not interpret older requirements as authorization to restore removed UI selectors.
