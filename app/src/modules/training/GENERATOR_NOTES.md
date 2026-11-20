# Question generator v1 contract

`generateQuestion(request)` accepts a string seed, zero-based question index,
scenario, and supported rule profile. Optional generator version must be
`question-generator-v1`; the retry budget defaults to 2048 and is capped at 4096.
Failures return no presentation question. Seeds are at most 1024 UTF-16 units;
indices must be nonnegative safe integers.

Each index has its own stream: JSON encoding of version, seed, index, scenario,
profile ID and profile version is hashed over UTF-16 units. FNV-style 32-bit
hashing initializes xorshift32; integer indices use fixed scaling. Shoes enumerate
copy, rank, then suit in the approved model's array order and use swap/pop draws.
IDs combine two fixed-salt hashes with scenario/index; they are deterministic,
noncryptographic identifiers, not authenticated or guaranteed globally unique.
Retry budgets do not change successful outputs. Sampling or serialization changes
require a new generator version; golden tests preserve this version's behavior.

A fresh physical shoe is used per attempt. The initial deal is player, dealer
upcard, player, dealer hole card. Only legal adapter-supplied actions are used.
Insurance is declined before a required Ace peek; ten-value peek outcomes also
come from the actual dealt dealer cards. Dealer Blackjack/other terminal results
are rejected for ordinary questions. No dealer play or settlement is simulated.

Scenarios are independent inputs, not a distribution:

- `initial`: untouched original ordinary decision after required checks.
- `continuing`: original hand reached by one to three legal Hits.
- `split`: first-child split lineage, with mandatory replacement cards; optional
  legal resplits up to the rule limit and zero to three legal local Hits.
- `insurance`: pre-peek Ace side decision without a player natural.
- `even-money`: pre-peek Ace side decision with an eligible natural.

Splits follow only the first child. Siblings retain their allocated original card
and await later replacement/play. No sibling dealing-order assumption or full
round simulation is needed. Baseline split Aces auto-complete and are not ordinary
questions. An attempt consumes at most ten cards: four initial, three replacement
draws, and three Hits. Physical-copy constraints are enforced by shoe removal.

The draft spec defers split continuations and leaves Even Money categorization,
Insurance quotas, Mixed ratios, and Balanced/Realistic distributions open. This
task explicitly adds separate split and Even Money scenario foundations; it does
not settle their eventual frequency or session-scoring treatment. Samples are
conditioned by scenario and rejection and are not claimed representative.

Only `result.question` is presentation data. It contains visible cards, public
peek-independent presentation metadata, legal choices, and no recommendation.
`result.answerKey` contains the exact adapter result and private source/evidence,
including the dealer hole card. Never spread the whole result into a UI view.
Evidence records actual draws, before-action snapshots, active physical cards,
and queued split cards so legality and conservation can be independently checked.
This client-side separation prevents accidental display, not deliberate cheating.
