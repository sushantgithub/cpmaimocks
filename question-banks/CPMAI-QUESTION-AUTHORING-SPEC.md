# CPMAI Question Bank — Authoring Spec

**STATUS: MASTER / ACTIVE.** This is the governing standard for CPMAI question-bank work.
Use it as the starting brief for Domain 4, Domain 5, future batches, replacement
questions, and external review sessions. Do **not** regenerate Domains 1–3 from it.

**Purpose.** Hand this file to any new session (Claude, GPT, or a human author) as the
starting brief for building a CPMAI domain question bank. It exists because Domains 1–3
took three full editorial review rounds to reach freeze, and almost every finding was
repeatable. Following this spec should get a new domain to freeze in one review round.

**Status of existing banks.**

| Bank | Status |
|---|---|
| Domain 1 (60) | FROZEN — mechanical test-writing debt tracked separately (§11) |
| Domain 2 (60) | FROZEN — mechanical test-writing debt tracked separately (§11) |
| Domain 3 (60) | **PERMANENTLY FROZEN** — reference implementation |

Domain 3 is the reference bank because it went through the complete defect-remediation
process. **Do not modify Domain 3** to chase the tighter targets in this spec; its known
results are accepted as frozen. The stricter targets apply prospectively to Domain 4, 5
and future banks.

**Priority order when rules conflict:**

> correctness › defensibility › natural wording › difficulty integrity › distribution symmetry

Every numeric target in this document (A14/B14/C14/D14, 4 select-two, ≤2 identical-key
run, ≤35% correct-is-longest) is a **QA target, not a licence to damage a good question.**
If hitting a target makes a question worse, keep the stronger question and report the
deviation.

---

## 1. The deliverable

One CSV per domain, 60 questions, matching the CertMocks admin import schema exactly.

**22 columns, in this order:**

```
question_id,question,option_a,option_b,option_c,option_d,correct_answer,
explanation,explanation_a,explanation_b,explanation_c,explanation_d,
domain,topic,difficulty,source,tags,is_test,option_e,option_f,
explanation_e,explanation_f
```

**Field conventions as frozen:**

| Field | Rule |
|---|---|
| `question_id` | `CPMAI-D<n>-001` … `-060`, sequential, no gaps |
| `correct_answer` | Single letter `C`, or comma-separated alphabetised `B,D` for select-two |
| `explanation` | The **key idea**: one line naming the principle tested. Not a summary of the answer. |
| `explanation_a`–`d` | Why that specific option is right or wrong. Required for every populated option. |
| `domain` | The domain name without the "Domain N:" prefix, e.g. `Identify Data Needs` |
| `topic` | Sub-topic within the domain (see §3) |
| `difficulty` | `EASY` / `MEDIUM` / `HARD` |
| `option_e` / `option_f` | Populated **only** on select-two questions. `option_f` unused to date. |
| `source`, `tags`, `is_test` | Left blank |

**Import path:** Admin → Questions → Import, Certification **CPMAI**, Content type **Quiz**.

The CertMocks importer currently enables **"Publish immediately" by default** — when
enabled the frontend sends `status: PUBLISHED`. For a pre-publication review import,
explicitly **uncheck "Publish immediately"** so the rows remain DRAFT. For a fully frozen
and validated bank, publishing immediately may be used intentionally.

Do not assume imports land as DRAFT.

---

## 2. CPMAI domain boundaries

Scope drift was the single largest source of rework. Six Domain 3 questions had to be
moved out after they were written. Decide the domain **before** writing, not after.

**Real CPMAI domains (5, per the PMI-CPMAI ECO):**

1. Support Responsible and Trustworthy AI Efforts
2. Identify Business Needs and Solutions
3. Identify Data Needs
4. Manage AI Model Development and Evaluation
5. Operationalize AI Solution

**CPMAI phases** (useful for authentic framing):
I Business Understanding · II Data Understanding · III Data Preparation ·
IV Model Development · V Model Evaluation · VI Model Operationalization

> Domain names were verified against the current PMI-CPMAI Examination Content Outline.
> The six CPMAI phase names were verified against current PMI CPMAI material.

### Exam weights and mock-paper composition

| # | Domain | Weight |
|---|---|---|
| 1 | Support Responsible and Trustworthy AI Efforts | 15% |
| 2 | Identify Business Needs and Solutions | 26% |
| 3 | Identify Data Needs | 26% |
| 4 | Manage AI Model Development and Evaluation | 16% |
| 5 | Operationalize AI Solution | 17% |

> Domain weights are verified against the current official PMI-CPMAI Examination
> Content Outline. PMI notes that the exact number of questions from each domain may
> vary by exam form; these percentages therefore define the target blueprint for
> CertMocks mock construction, not a claim that every live PMI exam contains an
> identical integer count per domain.

**The weights govern mock papers, not the bank.** Author each domain bank to a flat
target (60 per domain) so every domain has enough depth and spare capacity. The
sampler that builds a mock is what applies the weighting. Keeping the bank flat and
the paper weighted means a weight correction later is a config change, not a
re-authoring job.

**Rounding rule (deterministic).** Multiply the paper size by each domain weight,
take the integer part, then hand the leftover slots to the domains with the largest
fractional remainders. **When remainders tie, resolve the tie by ascending domain
number**, unless a separately approved blueprint explicitly overrides it. The tie
rule is not decoration: at a 60-question paper D2, D3 and D4 all carry a remainder
of 0.6 with only two slots to give, so largest-remainder alone does not determine
the answer. Ascending domain number sends them to D2 and D3. Every blueprint below
was regenerated under this rule and is unchanged by it.

Blueprint counts, exact to the paper size:

| Paper | D1 | D2 | D3 | D4 | D5 | Total |
|---|---|---|---|---|---|---|
| Full mock (120) | 18 | 31 | 31 | 19 | 21 | 120 |
| Half mock (60) | 9 | 16 | 16 | 9 | 10 | 60 |
| Mini mock (30) | 4 | 8 | 8 | 5 | 5 | 30 |
| Mini mock (20) | 3 | 5 | 5 | 3 | 4 | 20 |

**The full-length CertMocks simulation is 120 questions**, matching the real exam.
The current official PMI-CPMAI exam is 120 questions in 160 minutes: **100 scored
and 20 unscored pretest items.** PMI Study Hall likewise uses a 120-question
full-length simulation, so 120 is the right target for a paper that should feel like
the real thing.

Two consequences worth keeping straight:

- **Percentages are PMI's blueprint; the integer quotas below are ours.** The
  weights are official, but PMI states that per-domain question counts can vary by
  exam form. The rows below are the CertMocks implementation of that blueprint — a
  deterministic rounding of the official percentages, not a reconstruction of any
  particular live form.
- **Only 100 of the 120 are scored on the real exam.** CertMocks scores all 120,
  because we have no pretest items to seed and no reason to withhold a score. A
  candidate's CertMocks percentage is therefore computed on a different denominator
  than PMI's, and the two are not directly comparable. Say so wherever a full-mock
  score is shown.

Sampling rules for a weighted paper:

- Fill the per-domain quota exactly; never let one domain borrow another's slots.
- Inside a domain, hold the difficulty mix of the source bank rather than sampling
  difficulty at random, or a short paper drifts easy or hard by chance.
- **A 60-per-domain bank supports exactly one completely non-overlapping full
  mock.** Per paper the bank must supply 18 / 31 / 31 / 19 / 21. At 60 deep, D1
  and D4 would each carry three papers and D5 two, but D2 and D3 carry only one
  each, and the paper is limited by its scarcest domain. The 29 left over in D2
  and D3 are not a second paper.
- **Bank depth required for k completely non-overlapping full mocks** — capacity
  planning information only, *not* an instruction to author more questions:

  | Full mocks | D1 | D2 | D3 | D4 | D5 |
  |---|---|---|---|---|---|
  | 1 | 18 | 31 | 31 | 19 | 21 |
  | 2 | 36 | **62** | **62** | 38 | 42 |
  | 3 | 54 | **93** | **93** | 57 | **63** |
  | 4 | **72** | **124** | **124** | **76** | **84** |

  Bold marks a figure above the 60-per-domain deliverable. Reading the table: a
  second full mock would be short only in D2 and D3; a third would additionally be
  short in D5, which draws 21 per paper; a fourth would be short in every domain.

  **These figures are capacity-planning information only.** The standard
  domain-bank deliverable defined by this specification remains exactly 60
  questions. **Do not reopen or extend a frozen 60-question bank solely to meet
  these capacity figures.** If CertMocks later requires additional unique questions
  for non-overlapping mock papers, define a separate bank-expansion specification
  covering IDs, CSV structure, validation, review and import behaviour *before*
  authoring those questions. Until such a specification exists, question 61 has no
  defined ID, no validator contract and no import path, so authoring it would
  produce a file this pipeline cannot accept.

  Bank status under this specification:

  | Domain | Status |
  |---|---|
  | D1 | frozen at 60 |
  | D2 | frozen at 60 — do not add questions |
  | D3 | **permanently** frozen at 60 — do not add questions |
  | D4 | target 60 |
  | D5 | target 60 |
- **A 60-per-domain bank supports seven completely non-overlapping 30-question
  mini mocks**; D2 and D3 are again the limiting domains, at 8 questions per mini
  mock. At the other paper sizes the same bank gives three half mocks (60) and
  twelve 20-question mini mocks, limited by D2 and D3 in both cases.
- D2 and D3 are the binding constraint at every paper size, and always will be at
  26% each. If bank expansion is ever authorised under a separate specification,
  they are where it would start — but that is a decision for that specification,
  not an action licensed by this one.
- Select-two items count as one question against the quota.

### Domain 3 vs Domain 4 — the boundary that caused the rework

| Belongs in **D3** (Identify Data Needs) | Belongs in **D4** (Model Development) |
|---|---|
| Defining required data | Feature engineering / feature selection |
| Identifying and comparing sources | Data augmentation |
| Access, availability, rights | Synthetic-data generation techniques |
| Data sufficiency, representativeness | Model metrics and evaluation |
| Sampling for assessment | Thresholds |
| Data quality assessment | Preprocessing-fit leakage mechanics |
| Labelling and ground truth | Feature derivation / transformation execution |
| Integration and consistency | |
| Data definitions and meaning | |
| Privacy, consent, use restrictions | |
| Data readiness, source suitability | |

**Also watch D5 drift:** "what do we do if the external feed fails" is operational
continuity (D5). Reframe as *source suitability* — "can this source sustain the period
the solution depends on it" — to keep it in D3.

**Test to apply:** if the question could only be answered by someone thinking about the
model rather than the data, it is not D3.

---

## 3. Topic taxonomy

Give each domain 8–9 sub-topics, 5–10 questions each. Derive them by reading a large
sample of real questions for that domain, not by inventing categories.

Frozen examples:

- **D1** — Bias and fairness · Transparency and explainability · Privacy and data
  protection · Governance and accountability · Regulatory and compliance · Human
  oversight · Stakeholder trust · Safety, security and reliability · Culture and third parties
- **D2** — Problem definition · Business case and value · Success criteria ·
  Stakeholders and requirements · AI suitability and feasibility · Solution options ·
  Scope and prioritisation · Adoption and change readiness · Strategic alignment
- **D3** — Data requirements and sourcing · Data quality assessment · Labelling and
  ground truth · Data volume and representativeness · Privacy, consent and sensitive
  data · Data integration and consistency · Unstructured and alternative data · Data
  governance, lineage and roles

Set the topic label to what the question **tests**, not the scenario's setting.

---

## 4. Writing rules

### Stem
- Scenario-driven, PMI style: a situation, a complication, then a question.
- **Target 284 characters / 46 words** (measured median across the 180 frozen questions;
  observed range 168–475).
- End with a question mark, except select-two which ends `Select two.`
- Name roles, not people. Geography-neutral. No currency symbols or amounts.
- Give the stem every fact the key depends on. If the answer needs an assumption the
  stem doesn't state, the question is broken (this sank Q035 and Q055 in review).

### Options
- 4 options normally; 5 for select-two (A–E).
- **Target 74 characters** median, tight range. Keep all four within ~10% of each other.
- Every distractor must be something an informed candidate could plausibly choose.
- No option may be a superset or restatement of another.
- No option may be defensibly correct. "Rescope the project" is often a real alternative —
  if so, the stem must rule it out explicitly.

### Key idea (`explanation`)
- **One line, target 92 characters / 16 words.** Names the principle, not the answer.
- Good: *"A single accuracy figure cannot show whether a model's errors fall evenly
  across the people it affects."*
- Bad: *"Option C is correct because the team should break down results by group."*

### Per-option explanations
- **Target 169 characters.** Required for every populated option.
- Explain why *this* option fails, so a candidate who chose it learns something without
  reading the other three.
- Never merely restate the option. Never say "this is wrong because it isn't right."
- For the keyed option, explain what makes it right — do not open with a negation.

---

## 5. Set composition

| Parameter | Target |
|---|---|
| Questions | 60 |
| Difficulty | ~6 easy / ~37 medium / ~17 hard |
| Select-two | 4 |
| Single-answer keys | 14 / 14 / 14 / 14 across A–D |
| Longest identical key run | ≤ 2 |
| Select-two keys | Varied positions — **not all containing A** |
| Topics | 8–9, each 5–10 questions |

Correctness outranks symmetry. Do not reword a question to fix a distribution.

---

## 6. Process rules (learned the hard way)

**6.1 HARD BUILD INVARIANT — `(option_X, explanation_X)` is an inseparable pair.**
This caused the only two mechanically broken questions in the whole project. A patch
layer edited options by letter, a later pass reordered them, and the wrong letter
silently overwrote a correct option while its explanation stayed put. The result read as
a content defect but was a pipeline bug.

> **Rule.** Treat `(option_X, explanation_X)` as one unit. When options are reordered:
> 1. move the explanation with its option,
> 2. update `correct_answer` to the new position,
> 3. assert the new keyed explanation supports the new keyed option.
>
> **Never** perform "change option B" followed by an independent answer-letter shuffle.
> Assert after every build that each keyed letter has a populated option.

**6.2 Freeze a source of truth early.** Once a bank has been reviewed, edit the rendered
CSV directly by final letter — the letters the reviewer actually saw. Do not rebuild from
upstream generators.

**6.3 Make builds idempotent.** Scripts that append to files they also read will corrupt
on a second run.

**6.4 Guard what must not change.** When a review says "explanation only", assert at
build time that stems, options, keys, topics and difficulty are byte-identical before and
after. Run the assertion; don't trust intent.

**6.5 Mechanical and editorial review catch disjoint defects.** The validator will never
find a defensible distractor. A reviewer will never count option-length bias. Both passes
are required.

---

## 7. Defect checklist

Every item here was a real finding on Domains 1–3.

### Test-writing tells (invisible to reading, obvious to counting)
- [ ] **Correct answer is the longest option.** D1 hit 98%, D2 93% — against 25% chance,
      with a ~60% length premium. A candidate who knows nothing scores well above chance
      by picking the longest. Domain 3 improved this substantially to 54% (9% premium),
      but **still does not meet the preferred target**. For newly authored banks, target
      **≤ ~35%** correct-is-longest, while prioritising natural option quality and
      correctness over mechanical symmetry.
      Do **not** pad distractors with meaningless words to hit the number, and do **not**
      shorten correct options until they lose precision. The objective is removing
      answer-length signalling while preserving natural wording.
- [ ] **Select-two keys all contain the same letter.** All ten across D1/D2 contained A.
- [ ] Long runs of the same key letter.

### Factual and methodological
- [ ] **Confidently stated false principles.** A Domain 3 question claimed supervised
      learning requires a label on every record. It does not — a labelled representative
      subset trains fine; what a sample's *distribution* can't do is assign labels to
      individual unlabelled records.
- [ ] **Invented CPMAI rules.** Do not claim CPMAI mandates fixed-length iterations or
      Scrum-style timeboxes. CPMAI is iterative; it does not forbid replanning.
- [ ] **Expired technology assumptions.** "PDFs must be converted to text first",
      "raw prose cannot be fed to a model" — document and multimodal models consume these
      directly. Frame extraction requirements neutrally.

### Unsupported claims
- [ ] **Prevalence words doing unearned work** — "usually", "rarely", "routinely",
      "typically", "often", "normally".
      **This is not a word ban.** These words are not automatically prohibited. Flag one
      only when it introduces an unsupported general claim the candidate is asked to accept.
      - Bad: *"Engineers usually do X."* — an unestablished generalisation about a role.
      - Fine: *"The process usually takes three days"* — **if** the stem established that
        operational fact.
      Deliberate overstatement *inside a distractor*, where the overstatement is precisely
      what makes the option wrong, stays.
- [ ] **Unnecessary absolutes** — "always", "never", "no rule set captures",
      "cannot be evaluated".
- [ ] **Jurisdiction-specific legal claims** — "special category data", "protected
      attribute", GDPR/HIPAA/CCPA, "consent is required". Use geography-neutral wording:
      *"sensitive personal data, which may be subject to legal, ethical and organisational
      restrictions."*
- [ ] **Universal role accountabilities** — "engineers are accountable for…",
      "analysts see only aggregates". Argue from what the scenario requires instead.

### Structural
- [ ] Keyed explanation doesn't match its option (the pipeline bug).
- [ ] Two options meaning the same thing.
- [ ] A distractor that is also reasonably correct.
- [ ] The key depends on an assumption the stem never states.
- [ ] Throwaway distractors with no connection to the stem.
- [ ] Topic label describing the scenario rather than the concept tested.
- [ ] Counterfactual outcomes presented as observed facts.

---

## 8. Validator

Run after every build. Content checks:

```python
# 1  exactly 60 rows, single domain value
# 2  IDs CPMAI-D<n>-001..060, sequential and unique
# 3  key distribution across A-D, longest identical run <= 2
# 4  exactly 4 select-two; every select-two stem contains "Select two."
# 5  every keyed letter has a populated option
# 6  every populated option has its own explanation (and vice versa)
# 7  no explanation identical to its option
# 8  no keyed explanation opening as a rejection
# 9  no duplicate / near-duplicate stems (normalised prefix match)
# 10 no jurisdiction-specific legal terms
# 11 no currency symbols or amounts in stems
# 12 no unsupported universals in keyed explanations or key ideas
#    (target constructions, not any prevalence word)
# 13 no equivalent/superset option pairs (token Jaccard > 0.62)
# 14 no short distractor sharing no vocabulary with its stem
# 15 answer-length signal  (REPORT-ONLY, not an automatic failure)
#      Correct-is-longest:            XX%
#      Median correct-option length:  XX chars
#      Median distractor length:      XX chars
#      Correct-option length premium: XX%
#    A 35% correct-is-longest rate can still leak the answer if correct options are
#    consistently longer overall, so report the premium alongside the percentage.
#    Use judgement; do not blindly optimise these numbers.
# 16 stem length median and range   (report; target ~284 chars)
```

CSV checks:

```python
# 17 exactly 60 data rows, exactly 22 columns
# 18 header byte-identical to the shipped Domain 1 file
# 19 every row has 22 fields
# 20 no leading/trailing whitespace in any field
# 21 correct_answer matches ^[A-F](,[A-F])*$ and select-two keys alphabetised
# 22 option E/F populated only on select-two rows
# 23 source / tags / is_test blank
# 24 zero content difference between frozen source and CSV
```

Plus a **rendered-output comparison**: parse the review HTML back out and diff every
field against the CSV. Domain 3 compared 788 fields at 0 differences. This is what
proves the artefact the reviewer approved is the artefact being imported.

---

## 9. Workflow

1. **Inventory before writing.** Read the source material for the domain and build the
   topic taxonomy from it. If replacing questions, inventory what the surviving set
   already covers so replacements fill genuine gaps.
2. **Write**, following §4 and §5.
3. **Validate** (§8). Fix mechanically.
4. **Render a review HTML** — every question with its key, key idea and all per-option
   explanations. A reviewer cannot judge a bank from a CSV.
5. **External review** against §7. Ask for problems only, not a summary of what's fine.
6. **Revise precisely.** Do not reopen questions the review passed — polishing good
   questions introduces new ambiguity. Apply guards (§6.4).
7. **Re-validate, re-render, re-review** until the reviewer returns no substantive findings.
8. **Freeze:** regenerate CSV and HTML, run both validator suites, run the HTML↔CSV
   comparison, require 0 differences.

### Originality
When writing from a reference bank, check token overlap against every source question.
Domain 3 targets: **max Jaccard ≤ 0.40, mean ~0.22, zero exact matches.** Anything above
0.40 means the scenario premise was borrowed — re-set it in a different industry while
keeping the concept.

### Held pool
Questions that are good but belong to another domain go to
`cpmai-domain-4-held.csv` as `CPMAI-D4-H01`, `H02`, … Never discard them. Record the
origin ID and the reason in `source`.

### Starting a domain that already has a held pool — MANDATORY

**Do not generate 60 new questions and bolt the held ones on afterwards.** Inventory
first, then write only what the gaps require.

1. Inspect every held item in full.
2. Verify each against the current scope for that domain — a question held as "D4" may
   on inspection belong elsewhere.
3. Identify duplicates and conceptual overlap between held items.
4. Establish the domain's topic taxonomy (§3).
5. Map the surviving held questions onto those topics.
6. Identify the coverage gaps that remain.
7. Only then write enough new questions to reach 60.

**Domain 4 held pool as at freeze of Domain 3 — 8 questions:**

| ID | Concept |
|---|---|
| D4-H01 | Class imbalance / misleading 99.9% accuracy |
| D4-H02 | High-cardinality categorical handling |
| D4-H03 | Preprocessing-fit leakage before the split |
| D4-H04 | Feature derivation |
| D4-H05 | Target / data leakage |
| D4-H06 | Redundant features |
| D4-H07 | Data augmentation |
| D4-H08 | Synthetic-data generation |

Two further Domain 4 concepts were noted during Domain 1 work and are **not yet written
as questions** — confirm whether they exist anywhere before treating them as held:
model-family selection under an auditability constraint; thresholds and metrics under
asymmetric error cost.

---

## 10. Review prompt

Give the reviewer the rendered HTML plus this:

> You are reviewing N exam-practice questions for Domain X of the CPMAI certification.
> The attached HTML contains every question with its keyed answer, a one-line key idea,
> and a per-option explanation for each choice.
>
> Audience: working project managers preparing for the CPMAI exam. Phases: I Business
> Understanding, II Data Understanding, III Data Preparation, IV Model Development,
> V Model Evaluation, VI Model Operationalization. Format: 4 options, plus select-two
> items with 5. These are original questions, not from any official item bank.
>
> Report problems only — do not summarise what is correct. For each, give the question
> ID, what is wrong, and a concrete fix. Check in this order:
> 1. Is the keyed answer genuinely best, or is a distractor equally defensible?
> 2. Does anything contradict CPMAI methodology or invent a rule it does not have?
> 3. Is each question genuinely in this domain, not an adjacent one?
> 4. Does each explanation explain why *that* option fails, without contradicting the key idea?
> 5. Are distractors plausible to someone who half-knows the material?
> 6. Test-writing flaws: stem clues, absolutes, equivalent options, superset options, ambiguity.
> 7. Unsupported prevalence claims, jurisdiction-specific legal assertions, expired
>    technology assumptions, universal role accountabilities.
>
> Finish with: IDs to reject outright; IDs needing edits with the edit; and whether the
> set is fit to publish to paying candidates. Be blunt — I would rather hear about 15
> real problems than be told it looks good.

---

## 11. Known debt — D1/D2 mechanical test-writing bias

Domains 1 and 2 were frozen **before** the test-writing analysis and still carry:

| | Domain 1 | Domain 2 |
|---|---|---|
| Correct answer is longest | **≈98%** | **≈93%** |
| Correct-option length premium | ≈59% | ≈63% |
| Select-two keys containing "A" | all 6 | all 4 |

Neither is an answer-key or content defect. Both are genuine test-writing tells that let
a candidate score above chance without knowing the material, and should be corrected
before those banks go to paying candidates.

**Do not fix them opportunistically.** This is tracked as a separate QA task:

> ### TASK: D1/D2 mechanical test-writing bias remediation
>
> Constraints when it is undertaken:
> - preserve concepts
> - preserve the meaning of every correct answer
> - preserve difficulty as far as possible
> - introduce no new ambiguity
> - move option **and** explanation as an inseparable pair when reordering (§6.1)
> - rerun the complete mechanical validation
> - render HTML and compare CSV ↔ HTML
> - require **0 unintended content differences**
> - targeted editorial review of the changed options only — not a full re-review
>
> Do not casually reopen a frozen bank for anything less than this procedure.
