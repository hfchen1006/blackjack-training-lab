# Baseline strategy reference v1

Supported profile: `phase1-baseline`, version 1, with every approved baseline
setting unchanged. A structurally equal copy is supported; another ID, version,
setting, or unknown setting field is rejected. This does not verify casino rules.

Sources checked on 2026-11-20:

- Primary: https://wizardofodds.com/games/blackjack/strategy/4-decks/
- Cross-check: https://www.blackjackapprenticeship.com/wp-content/uploads/2024/09/S17-Basic-Strategy.pdf

The independent fixture `__fixtures__/s17-das-v1.ts` transcribes the published
S17 rows with DAS enabled. It has no imports. Production uses conditional rules,
not this fixture. Test expectations are decoded only from the fixture.

Coverage: 17 hard rows (4–20), eight soft rows (13–20), and ten canonical pair
rows, each against ten dealer columns: 350 cells. The compressed chart ranges
are expanded using the primary reference's low-hard-total and high-total rules.
Equal-rank J/Q/K pairs use the published ten-pair row; unlike ranks are hard 20.

No disagreement was found for the supported rules. Surrender overlays are
excluded; the underlying Hit/Stand/Double cells apply. Soft 18 uses Double with
Stand fallback against 3–6. Other Double cells use Hit fallback. The primary
reference explicitly resolves unavailable splits using the hard total, except
Aces. Baseline split Aces complete automatically, including capped Ace pairs;
the unsupported draw-to-split-Aces variant is not assigned a fallback.

Hard 4 can only be a two-card pair. Its hard-row tests use a split child at the
hand cap. Soft 12 can only be Ace/Ace: initially it splits, and a split Ace pair
has no ordinary decision under baseline rules. Totals of 21 and busts are
completion states, not recommendation rows. Continuing-hand tests provide
explicit draw histories and cover every reachable nonterminal total row.

The recommendations are total-dependent chart decisions, including on continuing
hands. They are not composition-dependent optimal-play claims. Both sources
decline Insurance and Even Money without counting information. The existing
side-phase API uses `decline-insurance` to decline the side offer; the strategy
result separately records Even Money as declined when it is eligible.

Case IDs use `baseline-s17-v1.<hard|soft|pair>.<value>.vs.<upcard>`; ten-value
dealer ranks share `10`. Reason keys are domain identifiers for later i18n.
No EVs, probabilities, generators, or presentation text are provided. Missing
reference/fallback coverage returns `uncovered-case`, never an assumed Hit.
