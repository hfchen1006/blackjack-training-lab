# Training distributions — Phase 1C.4

`generateDistributedQuestion` in `app/src/modules/training/distribution.ts` uses
`training-distribution-v1` independently of `question-generator-v1`. It accepts
seed, zero-based index, distribution, profile, optional versions and budgets.
Results retain the original public question and private answer key separately;
additional metadata records requested/actual category, explicit provenance,
original seed/index, candidate count and reproducible distribution identity.
IDs are neither cryptographic nor guaranteed globally unique.

## Balanced

Each three-question block contains one Hard, Soft and exact-rank Pair question.
A seed-selected permutation rotates across blocks, so every prefix of 25, 50 or
100 has category counts differing by at most one and remainders vary by seed.
Pairs take classification precedence over Soft; 10+J remains Hard.

A seeded, rotating 60-question provenance schedule plans 48 initial, nine
continuing and three split hands. These 80/15/5 proportions are provisional
engineering defaults, not empirically optimal learning ratios. Continuing slots
only target Hard or Soft; split slots may target any category. There is no
mandatory impossible pair/continuing combination. Failure preserves the planned
category rather than replacing it to meet a provenance percentage.

Candidates use versioned derived seeds and the approved scenario generator.
Matching candidates within a fixed 32-candidate window favor a rotating dealer
upcard, then a seeded score per strategy case ID. After that window, the first
matching candidate succeeds. This encourages variety without a second strategy
table or a guarantee of unique cases. Sampling is bounded to 128 candidates by
default, extended once to 256 by session recovery. A candidate generator failure
is propagated explicitly; exhausted category sampling has its own failure code.
There is no silent category/provenance substitution.

Each generator call keeps the normal 2048-attempt limit, extended to 4096 on
recovery. Extensions retain candidate seed order, category, original seed/index
and already successful results. Custom candidate budgets below 32 shorten the
diversity window and must be supplied again for exact replay. Worst-case work is
bounded by candidate count times generator attempts; this is not a latency SLA.

## Realistic

Calls `generateQuestion({scenario: 'initial', ...})` directly with the original
seed and index. There is no category rejection, quota or diversity selection.
Each question samples a fresh six-deck physical shoe without replacement within
the round, internally declines Insurance, and resolves an actual American peek.
Player/dealer natural Blackjack rounds are excluded as non-actionable. This is
the distribution of actionable initial decisions, not persistent shoe depletion
or a casino simulator. No side-decision questions are exposed.

An independent test enumerates ordered rank draws (player, upcard, player, hole),
with 24 copies of each rank and multiplicities reduced after every draw, then
excludes either natural. Of 8,432,031,600 surviving physical-card combinations:

| Category | Combinations | Expected frequency |
| --- | ---: | ---: |
| Hard | 6,935,182,848 | 82.2481% |
| Soft | 842,102,784 | 9.9870% |
| Exact-rank Pair | 654,745,968 | 7.7650% |

The fixed 12,000-question sample uses Hoeffding's bound with a union bound over
three proportions at alpha 0.000001: absolute tolerance
`sqrt(log(6/alpha)/(2*12000))`, about 2.55 percentage points. This checks PRNG
behavior against independent combinatorics; it does not prove randomness.

Practice and Speed Run share the distribution loader. Legacy scenario selection
remains available to domain callers, while the UI only offers Balanced/Realistic.
An active run holds its original config. Language and total visibility only
change presentation. Metadata is retained in in-memory answer records; grading
and timing continue to use the existing supplied decision and session functions.
