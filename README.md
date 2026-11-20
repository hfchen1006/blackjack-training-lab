# Blackjack Training Lab

A mobile-friendly, bilingual (English / Traditional Chinese) Blackjack decision-training web app.

**Status:** Requirements drafted. No application code has been implemented in this repository starter.

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

The framework and architecture are intentionally **not selected yet**. This starter contains planning files only. Review and approve the spec before Codex or any developer implements the application.

## Sharing and privacy

A challenge link should never contain browser history, private notes, or other personal data. A result image can optionally show a user-entered nickname. Without a server, results cannot be verified against tampering; this feature is intended for friendly challenges, not a trusted leaderboard.

## Disclaimer

This is an educational practice app, not a gambling prediction or guaranteed-win system. Correct strategy depends on the selected rules and scoring model.
