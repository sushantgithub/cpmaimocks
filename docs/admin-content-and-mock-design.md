# CertMocks Admin Content & Mock Exam Design

**Status:** Locked for implementation  
**Project:** CertMocks (certmocks.com)  
**Repository:** `sushantgithub/cpmaimocks`

## 1. Goals

This design defines how CertMocks manages certifications, domains/topics, question imports, quizzes, mock exams, and the shared practice pool.

The platform must support multiple certification bodies and must work for certifications that:
- use Domains and Topics,
- use Domains but not Topics,
- or use neither.

The design must also keep Quiz, Mock Exam, and Practice behavior clearly separated while allowing all published learning content to participate in Practice.

---

## 2. Content Hierarchy

### 2.1 Certification

Certification is the top-level content owner.

Examples:
- CPMAI
- PMP
- PMI-ACP
- CSM
- CSPO
- SAFe certifications

A certification owns its Domains, Topics, Questions, Quizzes, Mock Exams, Plans, and related learner content.

### 2.2 Optional Domain/Topic structure

The system must not globally require Domain or Topic.

Each Certification must declare whether it uses Domains.

When a certification uses Domains:
- Domain is required for imports where that certification requires domain classification.
- Domain admin must clearly show/select the Certification.
- Domain choices shown during import must come from the selected Certification.

When a certification does not use Domains:
- Domain must not block import.
- Domain filters/reporting should be hidden for that certification.

Topic is optional for now and must not block import. It may be used where available.

Supported structures therefore include:

`Certification -> Domain -> Topic -> Question`

`Certification -> Domain -> Question`

`Certification -> Topic -> Question`

`Certification -> Question`

---

## 3. Domain Admin

The Domain admin UI must make the Domain-to-Certification relationship explicit.

Required behavior:
- Show a **Certification Name** selector/field.
- Populate it from Certifications configured in Admin.
- Add/manage Domains under the selected Certification.
- When viewing/editing a Domain, clearly show which Certification owns it.
- Existing merge/rename/delete behavior remains certification-scoped.

---

## 4. Import Model

The import screen begins with:

1. **Certification**
2. **Content Type**

Content Type options:
- **Quiz**
- **Mock Exam**
- **Practice Only**

The selected Certification controls whether Domain/Topic fields are validated or ignored.

### 4.1 Practice is a superset

Practice is not an isolated copy of content.

Every published:
- Quiz question,
- Mock Exam question,
- Practice-only question

is available in the Practice pool.

Example:

- Quiz content: 340 questions
- Mock content: 240 questions
- Practice-only content: 100 questions

Total Practice pool = **680 questions**.

Questions must not be duplicated merely to make them available in Practice. Practice eligibility is derived from the published question record/content type and assignment state.

### 4.2 Content Type behavior

| Content Type | Quiz | Mock Exam | Practice |
|---|---:|---:|---:|
| Quiz | Yes | No by default | Yes |
| Mock Exam | No by default | Yes | Yes |
| Practice Only | No | No | Yes |

A future enhancement may allow intentional reuse across surfaces, but the initial implementation should preserve the above defaults.

---

## 5. Quiz Design

Quiz imports belong to a Certification and, where applicable, a Domain/Topic.

For the current CPMAI content model:
- 60 questions imported for one Domain
- Quiz size = 10 questions
- System creates 6 fixed quiz sets

Example:
- Questions 1-10 -> Quiz 1
- Questions 11-20 -> Quiz 2
- Questions 21-30 -> Quiz 3
- Questions 31-40 -> Quiz 4
- Questions 41-50 -> Quiz 5
- Questions 51-60 -> Quiz 6

The quiz membership is static.

Questions in Quiz content are automatically available in Practice.

Practice behavior for these questions is independent of which quiz slot they belong to.

---

## 6. Mock Exam Definition

A Mock Exam is a configurable timed exam container.

The system must **not hard-code 120 questions**.

Examples:

### Full Mock
- Name: Full Mock 1
- Questions: 120
- Time: 120 minutes
- Passing percentage: configurable

### Mini Mock
- Name: Mini Mock 1
- Questions: 50
- Time: 100 minutes
- Passing percentage: configurable

Other certifications may define different question counts and time limits.

### 6.1 Required Mock fields

When creating a new Mock Exam, require:
- Certification Name
- Mock Exam Name
- Question Count
- Time Limit
- Passing Percentage
- Access Type: Free or Subscriber/Paid

Time limit, passing percentage, and access type may be edited later.

New Mock Exams remain **Draft** after creation/import until explicitly published.

---

## 7. Mock Exam Import

When Content Type = Mock Exam, Admin must support both:

- **Create New Mock Exam**
- **Add to Existing Mock Exam**

### 7.1 New Mock import

The Mock Exam is created first with its configured target question count.

The CSV must contain exactly the number of valid questions required to fill the mock.

Example:
- Target = 120
- Import must contain exactly 120 valid rows

If the CSV has 120 rows but 2 are invalid, the entire import fails.

Mock imports are **all-or-nothing**.

### 7.2 Adding to an existing Mock

Admin may first increase the configured target count.

Example:
- Existing: 120/120
- Admin changes target: 150
- Missing: 30
- Next import must contain exactly 30 valid questions
- After import: 150/150

Incremental imports are also all-or-nothing.

### 7.3 Reducing a Mock

If 150 questions are assigned and Admin wants a 120-question mock:
- Admin must first remove/unassign 30 questions from the Mock.
- Once assigned count reaches 120, Admin may reduce target count to 120.

The application must not allow target count to be set below the number of currently assigned questions.

### 7.4 Remove from Mock vs Delete Question

These are different operations.

**Remove from Mock**
- removes only the Mock assignment,
- keeps the Question in the Question Bank,
- keeps the Question available in Practice.

**Delete Question**
- permanently deletes the Question record,
- is a separate explicit Admin action,
- requires confirmation.

---

## 8. Duplicate Questions Across Mocks

Cross-mock duplicate blocking is not required.

Admin may import the same or very similar question into Mock 1, Mock 2, or Mock 3.

The content process is expected to aim for unique questions, but the application must not prevent reuse.

Possible future enhancement:
- non-blocking "possible duplicate" warning.

Do not implement risky automatic text-based deduplication in the initial version.

---

## 9. Mock Attempt Behavior

### 9.1 Fixed membership, randomized order

Mock question membership is static.

If Mock 1 contains 120 questions, every attempt serves those same 120 questions.

Only the **question order** changes between attempts.

Example:
- Attempt 1: Q17, Q3, Q84, ...
- Attempt 2: Q62, Q119, Q8, ...

### 9.2 Answer option order

Answer option order remains fixed exactly as authored/imported.

Only question order is randomized.

### 9.3 Unlimited attempts

Learners may take the same Mock Exam any number of times.

Each attempt is stored independently.

Attempt history should show:
- Attempt 1 - score
- Attempt 2 - score
- Attempt 3 - score
- etc.

Old attempts must remain reviewable.

---

## 10. Mock Timer & Session Rules

Mock Exams are timed.

Rules:
- No pause.
- Timer starts when the learner starts the attempt.
- Timer continues even if the learner closes the browser/app or loses connection.
- Answers and Mark-for-Review state auto-save.
- If learner returns before expiry, restore saved state and remaining time.
- If time reaches zero, automatically submit the attempt.
- After expiry, learner cannot modify answers.
- Blank questions at submission/expiry become **Unanswered**.

The authoritative timer should be server/deadline based, not dependent only on client state.

---

## 11. In-Exam Navigation

During a live Mock Exam, the learner can:
- move freely between questions,
- change answers before final submission,
- skip and return later,
- mark a question for review,
- jump directly through a question navigator/palette.

The question navigator should clearly show relevant states such as answered, unanswered, and marked for review.

### 11.1 Early submission

If the learner submits before time expires, show a confirmation summary including:
- Answered count
- Unanswered count
- Marked for Review count

Actions:
- Return to Exam
- Submit Final

---

## 12. Mock Results & Review

Score and explanations are not shown during the exam.

They become available only after the full Mock Exam is submitted or auto-submitted.

For each reviewed question show:
- learner selected answer,
- correct answer,
- explanation.

Final review filters:
- **All**
- **Correct**
- **Incorrect**
- **Unanswered**
- **Marked for Review**

"Marked for Review" is an additional flag and may overlap with Correct or Incorrect.

No separate "Answered" or "Skipped" final filter is required.

---

## 13. Domain Performance

For Certifications that use Domains, Mock results show:
- Overall performance
- Domain-wise performance

For Certifications without Domains:
- Show overall performance only
- Hide domain breakdown

Domain is therefore optional at platform level but useful for analytics where the selected Certification supports it.

---

## 14. Practice Mode

Practice contains every eligible published question across:
- Quiz content
- Mock Exam content
- Practice-only content

Practice-only questions must never automatically appear in Quiz or Mock.

Removing a question from a Mock does not remove it from Practice.

Practice must NOT expose a Quiz / Mock Exam / Practice Only content-type filter to learners.

The learner sees one combined Practice pool containing all published Quiz, Mock Exam, and Practice-only questions. Where the selected Certification uses Domains, the learner may narrow that combined pool by Domain. Existing learner filters such as Certification, Difficulty, question count, mistakes, and bookmarks may continue to work. Domain filters should be hidden where the selected Certification does not use Domains.

---

## 15. Recommended Data Model Direction

The implementation should distinguish:
- where a question originated/is intended to be surfaced,
- and which Mock Exams it is explicitly assigned to.

Recommended initial model:
- Question has a content classification such as:
  - `QUIZ`
  - `MOCK_EXAM`
  - `PRACTICE_ONLY`
- Existing MockExamQuestion remains the authoritative many-to-many assignment between Questions and Mock Exams.
- Practice is derived from published eligible Questions; do not copy records into a separate Practice table.
- Certification gains a domain-structure setting, e.g. `usesDomains`.

If existing behavior or migrations make an eligibility model safer than a single enum, implementation may use equivalent flags/relations as long as product behavior remains identical to this document.

---

## 16. Import Validation Rules

Common rules:
- Certification is required.
- Content Type is required.
- Required question/option/correct-answer validation remains.
- Domain validation is driven by Certification configuration.
- Topic remains optional for now.

Quiz:
- imported question count may generate fixed 10-question quiz slots according to configured quiz size.

Mock:
- must exactly fill the target/missing count,
- no partial import,
- remains Draft until explicitly published.

Practice Only:
- imported questions become Practice eligible only,
- do not generate Quiz slots,
- do not attach to Mock Exams.

---

## 17. Admin Reporting

Content type is an Admin/import classification only; it is not a learner-facing Practice filter.

Admin should be able to understand inventory by Certification, for example:

- Quiz Questions: 340
- Mock Exam Questions: 240
- Practice-only Questions: 100
- Total Practice Pool: 680

This reporting should derive from actual data and avoid double-counting the same Question record.

---

## 18. Existing Issues to Correct During Implementation

The current implementation has known mismatches that should be corrected as part of this work:

1. Import UI says CSV or Excel while current client accepts CSV only.
2. Successful import message currently always says questions were added as drafts, even when publish-immediately was selected.
3. Import currently auto-selects/falls back to the first Certification; imports should require an explicit Certification choice.
4. Current domain-derived quizzes can include all published questions in a Domain; they must include only Quiz-designated content.
5. Existing Mock auto-fill can pull arbitrary published questions from a Certification; it must respect the new content/assignment rules.
6. Practice should intentionally include Quiz + Mock + Practice-only content and should not depend on accidental query behavior.

---

## 19. Implementation Order

Recommended sequence:

1. Schema changes and migration SQL
   - Certification domain capability
   - Question content classification
2. Certification Admin updates
3. Domain Admin certification field/context
4. Import workflow redesign
5. Quiz eligibility filtering/static grouping
6. Mock create/edit/import validation
7. Mock learner attempt/timer/review behavior
8. Practice query updates
9. Admin inventory/reporting
10. Regression tests and deployment verification

---

## 20. Acceptance Summary

The design is considered implemented when:

- Admin can configure certifications with or without Domains.
- Domain Admin is explicitly certification-aware.
- Import requires Certification and Content Type.
- Quiz imports feed fixed quizzes and Practice.
- Mock imports can create or extend mocks and must exactly fill configured counts.
- Practice-only content never enters Quiz/Mock automatically.
- Practice includes all published Quiz/Mock/Practice-only questions.
- Mock membership is fixed while question order changes per attempt.
- Answer option order stays fixed.
- Mock timer cannot be paused and survives reconnects.
- Attempts auto-save, auto-submit at expiry, and support unlimited history.
- Results appear only after submission and include the agreed filters.
- Domain analytics appear only when applicable.
- Removing a question from a Mock leaves it available in Practice.
