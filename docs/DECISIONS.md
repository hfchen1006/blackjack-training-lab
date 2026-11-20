# Requirements & Decision Log

Last revised: 2026-11-20. `Confirmed` means stated by product owner; `Default` means accepted starting behavior; `Proposed` means not yet fully approved.

| ID | Decision | Status |
| --- | --- | --- |
| D-01 | Phase 1 emphasizes Basic Strategy speed and accuracy, with card counting in later phases | Confirmed |
| D-02 | Practice shows immediate feedback; Speed Run reviews at session end | Confirmed |
| D-03 | S17 is the preferred dealer soft-17 rule | Confirmed |
| D-04 | DAS allowed as the training default; actual casino DAS unknown | Default |
| D-05 | Six decks, no surrender, American peek, 3:2 | Proposed |
| D-06 | Speed Run chooses Balanced or Realistic before starting | Confirmed |
| D-07 | Balanced + 50 questions is the initial setup preference | Confirmed |
| D-08 | Hand total toggle, hidden by default | Confirmed |
| D-09 | Initial Only, Continuing Hands, and Mixed supported in Phase 1, with separate stats | Confirmed |
| D-10 | Manual Review and Weakness Drill both in Phase 1 | Confirmed |
| D-11 | Insurance decisions in Phase 1 | Confirmed |
| D-12 | Even Money special scenario | Proposed extension of Insurance |
| D-13 | English and Traditional Chinese app experience | Confirmed |
| D-14 | Mobile-friendly web app, shareable with American friends | Confirmed product direction |
| D-15 | Share as Image and Challenge Link must be in Phase 1 | Confirmed |
| D-16 | Same Seed challenge default and deterministic task lists | Proposed implementation choice |
| D-17 | No user accounts, cloud backend, or verified leaderboard in Phase 1 | Proposed scope boundary |

## Notes

- Insurance and Even Money are not substitutes for Hit/Stand scoring. Without count information, Basic Strategy normally declines an Insurance side bet.
- Speed Run performance comparisons must retain settings and generator versions.
- User requested A (complete spec) followed by B (GitHub / VS Code setup). This planning starter contains no game implementation.
