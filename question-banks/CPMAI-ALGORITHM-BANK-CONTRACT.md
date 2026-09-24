# CPMAI Algorithm Bank — Deliverable Contract

Companion to `CPMAI-QUESTION-AUTHORING-SPEC.md`. That spec governs **domain**
banks. The Algorithm bank is a **tag quiz**, not a domain bank, so parts of it do
not transfer. This file records only the deltas. Everything the spec says that is
not contradicted here still applies — in particular §4 stem and explanation
quality, §6 build invariants, §7 the defect checklist, and §9 the workflow.

## Why this is a different deliverable

`prisma/schema.prisma` — *"A quiz that groups questions by tag rather than by
domain, e.g. an algorithm drill whose questions live in several domains."*

`src/lib/admin-question-sets.ts:113` excludes any question carrying a claimed tag
from its **domain** pool:

```ts
!question.tags.some((tag) => claimedTags.has(tag))
```

**Consequence:** a question tagged `algorithm` appears in the Algorithm drill and
**not** in its domain quiz. Domains 1–5 are unaffected — they are frozen with
`tags` blank.

## Deltas from the domain-bank spec

| | Domain bank | Algorithm bank |
|---|---|---|
| Questions | exactly 60 | exactly **40** |
| IDs | `CPMAI-D<n>-001..060` | `CPMAI-ALG-001..040` |
| `tags` | blank | **`algorithm`** — must match the Quiz row's Tag field exactly |
| `domain` | the one domain | the **most relevant** of the five per question |
| Select-two | 4 | **0** — the reference format is uniformly single-answer |
| Keys | 14 / 14 / 14 / 14 | **10 / 10 / 10 / 10**, longest run ≤ 2 |
| Difficulty | 6 / 37 / 17 | **4 EASY / 25 MEDIUM / 11 HARD** (same proportions at 40) |
| Topics | 8–9, 5–10 each | **7**, 4–8 each |
| Option length | ~74 chars, sentences | **~28 chars**, technique names |
| Stem length | ~284 chars | **~224 chars** |

The option and stem targets are measured from the 140 algorithm-style questions
in the 746-question reference bank, not chosen. 54% of its options are ≤ 40
characters, because the options are the *names of techniques*.

## Validator deltas (§8)

Re-target: **check 1** 40 rows; **check 2** the ALG id range; **check 3**
10/10/10/10; **check 23** `tags` = `algorithm` on every row, `source` and
`is_test` still blank.

Drop: **check 4** (select-two) and **check 22** (option E/F) — not applicable at
zero select-two.

Re-interpret, do not enforce: **check 15**. Correct-is-longest carries little
meaning when options are one to four words, and a two-word correct answer among
three-word distractors is not a tell. Report it; do not tune it.

**Check 14 — not applicable, and reported rather than enforced.** Its purpose in
the domain spec is to catch throwaway distractors with no connection to the stem.
Here the options are the *names of techniques*, so they connect to the scenario
conceptually rather than lexically. 63 of 160 options are lexically unconnected
**by design**. All 160 were audited by hand: every unconnected option names a real
technique, keys and distractors alike, and none is a throwaway. Enforcing the check
would mean rewording correct answers to satisfy a test that does not fit the
format, so the validator reports the count instead of failing on it.

Keep unchanged and still binding: checks 5–13 and 16–21, 24.

**Cross-bank originality.** Because this bank overlaps Domain 4's subject matter,
originality must be measured against the **frozen domain banks as well as** the
external references. The first draft produced an Algorithm question at Jaccard
0.395 against frozen `CPMAI-D4-024` — inside the 0.40 limit but effectively the
same scenario, which a candidate would meet twice. It was rewritten. Passing the
threshold against your own frozen content is not sufficient.

## What the bank tests

PM-level **technique selection**: given a described problem and the data
available, which approach or family fits. Not the mechanics of how an algorithm
works. This follows the reference bank's own pattern — a short scenario, then
"which machine learning approach fits this task?".

## Topics (7)

| n | Topic |
|---|---|
| 8 | Learning paradigms |
| 8 | Task type selection |
| 6 | Algorithm families and interpretability |
| 6 | Deep learning and neural networks |
| 4 | Language and text approaches |
| 4 | Vision, recommendation and other applied families |
| 4 | Tooling, compute and build-versus-adapt |

## Import

Admin → Questions → Import, Certification **CPMAI**, Content type **Quiz**,
exactly as for a domain bank. Then Admin → Quizzes → create the drill with
Name `Algorithms` and Tag `algorithm`. **The Tag field must match the CSV's
`tags` column or the drill returns nothing.**
