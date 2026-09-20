# CertMocks Implemented Requirements Specification

**Document Type:** Implemented Requirements / As-Built Functional Specification  
**Project:** CertMocks (certmocks.com)  
**Repository:** `sushantgithub/cpmaimocks`  
**Branch:** `claude/cpmai-exam-platform-dg2pob`  
**Status:** Implemented in code  
**Date:** 20 September 2026

## 1. Purpose

This document records the requirements that have been implemented for CertMocks certification content management, question import classification, Practice behavior, Mock Exam administration, Mock Exam attempt behavior, results/review, and admin inventory reporting.

It is an **as-built requirements document**: each requirement below describes behavior that has already been implemented in the current project branch.

## 2. Scope

The implemented scope covers:

- Certification configuration for certifications with or without Domains.
- Domain administration linked explicitly to Certification.
- Question classification as Quiz, Mock Exam, or Practice Only.
- Content-aware CSV import.
- New and existing Mock Exam import workflows.
- Mock target question count safeguards.
- Practice as one combined learner question pool.
- Fixed Quiz content isolation and deterministic 10-question grouping.
- Timed Mock Exam attempt/resume behavior.
- Question randomization per Mock attempt while preserving answer-option order.
- Autosave and Mark for Review.
- Final submission confirmation.
- Attempt-wise Mock history.
- Final result filters and Domain performance.
- Certification-level admin inventory reporting.

## 3. Definitions

| Term | Definition |
|---|---|
| Certification | Top-level content owner, e.g. CPMAI, PMP, PMI-ACP, CSM, CSPO. |
| Domain | Optional syllabus grouping belonging to one Certification. |
| Quiz Question | Question classified for Quiz use; also available in Practice when published. |
| Mock Exam Question | Question imported/assigned for Mock Exam use; also available in Practice when published. |
| Practice Only Question | Question available only in Practice and not automatically included in Quiz or Mock Exam. |
| Practice Pool | Combined pool of all published Quiz, Mock Exam, and Practice Only questions. |
| Remove from Mock | Unassign a question from one Mock Exam without deleting the Question record. |
| Attempt | One learner sitting of a Mock Exam. |

## 4. Implemented Functional Requirements

### FR-001 - Certification Domain Capability

The system shall allow each Certification to specify whether it uses Domains.

**Implemented behavior:**
- Certification has a `usesDomains` setting.
- Existing Certifications default to `true`.
- Admin can configure the setting from Certification Admin.
- Certification API exposes the setting where required by learner/admin flows.
- Certifications without Domains are supported without forcing Domain classification.

**Status:** Implemented.

### FR-002 - Domain Administration by Certification

The Domain Admin screen shall explicitly associate Domains with a Certification.

**Implemented behavior:**
- Domain Admin displays a Certification Name selector.
- Domains shown and created are scoped to the selected Certification.
- Certifications with Domains disabled cannot receive new Domains.
- Rename, merge, and delete behavior remains certification-scoped.

**Status:** Implemented.

### FR-003 - Question Content Classification

Each Question shall have an Admin content classification.

Supported values:
- `QUIZ`
- `MOCK_EXAM`
- `PRACTICE_ONLY`

**Implemented behavior:**
- Existing questions default to `QUIZ`.
- New imports store the selected classification.
- The classification is used to prevent content intended only for Mock/Practice from leaking into automatically generated Quiz pools.
- Practice eligibility is not restricted by this classification; all published questions remain eligible for Practice.

**Status:** Implemented.

### FR-004 - Explicit Certification Selection During Import

Bulk import shall require an explicit Certification selection.

**Implemented behavior:**
- Import no longer silently falls back to the first Certification.
- Admin must select Certification before uploading.
- Certification controls Domain validation behavior.

**Status:** Implemented.

### FR-005 - Import Content Type Selection

Bulk import shall require a Content Type selection after Certification.

Supported choices:
- Quiz
- Mock Exam
- Practice Only

**Implemented behavior:**
- Import UI presents Certification first, then Content Type.
- Explanatory text identifies where each type will be used.

**Status:** Implemented.

### FR-006 - Domain Validation Based on Certification

Domain shall be required only where the selected Certification uses Domains.

**Implemented behavior:**
- For Certifications with `usesDomains = true`, Domain is validated during CSV preview and server import.
- For Certifications with `usesDomains = false`, Domain and Topic do not block import.
- Topic remains optional.

**Status:** Implemented.

### FR-007 - Quiz Content Isolation

Automatically generated domain Quiz pools shall use only Questions classified as `QUIZ`.

**Implemented behavior:**
- Mock Exam and Practice Only questions do not appear in domain Quiz pools.
- Tag-based Quiz pools also use only `QUIZ` questions.

**Status:** Implemented.

### FR-008 - Static Quiz Grouping

Domain Quiz content shall be grouped deterministically into fixed 10-question Quiz sets.

**Implemented behavior:**
- Quiz size remains 10 questions.
- Questions are ordered deterministically by import/creation order.
- First 10 questions form Quiz 1, next 10 form Quiz 2, and so on.
- Existing learner canonical Quiz sets remain preserved where already recorded.

Example: 60 Quiz questions in one Domain produce six 10-question Quiz sets.

**Status:** Implemented.

### FR-009 - Unified Practice Pool

Practice shall use one combined learner pool rather than separate Quiz/Mock/Practice-only pools.

**Implemented behavior:**
- Every published Question is eligible for Practice.
- Published Quiz questions are in Practice.
- Published Mock Exam questions are in Practice.
- Published Practice Only questions are in Practice.
- No learner-facing Quiz / Mock Exam / Practice Only filter has been added to Practice.
- Domain filtering remains available where the selected Certification uses Domains.
- Domain filtering is hidden for Certifications without Domains.

**Status:** Implemented.

### FR-010 - Mock Exam Creation During Import

When Content Type is Mock Exam, Admin shall be able to create a new Mock Exam as part of the import workflow.

**Implemented fields:**
- Certification
- Mock Exam Name
- Target Question Count
- Time Limit in minutes
- Passing Percentage
- Access Type: Free or Subscriber/Paid

**Implemented behavior:**
- New Mock Exams are created as Draft.
- Mock Exams are configured as timed.
- Full assigned question set is served per attempt.
- Question randomization is enabled.
- Immediate explanations are disabled.

**Status:** Implemented.

### FR-011 - Import into Existing Mock Exam

Admin shall be able to import questions into an existing Mock Exam.

**Implemented behavior:**
- Existing Mock Exams for the selected Certification can be selected.
- UI shows assigned/target counts and missing count.
- Import must exactly fill the current missing count.

Example: if target is 150 and 120 are assigned, import must contain exactly 30 valid questions.

**Status:** Implemented.

### FR-012 - Mock Import All-or-Nothing Validation

Mock Exam CSV import shall be atomic.

**Implemented behavior:**
- If any row fails validation, Mock import is blocked.
- Partial Mock imports are not allowed.
- Imported Mock questions and their Mock assignments are created in a database transaction.
- Required CSV count must exactly match the missing Mock count.

**Status:** Implemented.

### FR-013 - Mock Target Count Safeguard

Admin shall not be able to reduce a Mock Exam target below its currently assigned question count.

**Implemented behavior:**
- If 150 questions are assigned, target cannot be changed to 120.
- Admin must first remove/unassign 30 questions and save.
- Only after assigned count reaches 120 may the target be changed to 120.

**Status:** Implemented.

### FR-014 - Remove from Mock Does Not Delete Question

Removing a Question from a Mock Exam shall only delete the Mock assignment.

**Implemented behavior:**
- Question remains in the Question Bank.
- Question remains available in Practice when published.
- Admin UI explains this behavior.
- Permanent Question deletion remains a separate operation.

**Status:** Implemented.

### FR-015 - Published Mock Completeness

A published Mock Exam shall remain complete.

**Implemented behavior:**
- A Mock cannot be published unless assigned question count equals target question count.
- All assigned Questions must be published.
- A currently published Mock cannot be saved in an incomplete state.
- Admin must change the Mock to Draft before restructuring/removing questions that would make it incomplete.

**Status:** Implemented.

### FR-016 - Mock Question Membership

Each Mock Exam shall use its assigned question set as the fixed content set for every attempt.

**Implemented behavior:**
- Full Mock attempts serve the complete assigned set.
- `questionsPerAttempt` is locked to full-pool behavior for the implemented Mock workflow.
- Mini Mocks are supported by configuring a smaller target Question Count, e.g. 50.

**Status:** Implemented.

### FR-017 - Question Order Randomization Per Attempt

Mock Exam question order shall change between attempts.

**Implemented behavior:**
- A fresh attempt receives a randomized question order.
- The same fixed question membership is used.
- Randomized order is persisted with the attempt.
- Resume and final review use the exact order originally served for that attempt.

**Status:** Implemented.

### FR-018 - Answer Option Order Remains Fixed

Answer option order shall not be randomized.

**Implemented behavior:**
- A/B/C/D/E/F stay in the authored/imported order.
- Only question order changes across Mock attempts.

**Status:** Implemented.

### FR-019 - Unlimited Mock Attempts

Learners shall be able to take the same Mock Exam multiple times.

**Implemented behavior:**
- Completed attempts are stored independently.
- Starting again after a completed attempt creates a new attempt.
- Previous attempt scores/results are not overwritten.

**Status:** Implemented.

### FR-020 - Resume Active Mock Attempt

A learner returning to an in-progress Mock shall resume the existing attempt.

**Implemented behavior:**
- Opening the Mock again does not abandon/reset the live attempt.
- Previously saved answers and Mark for Review states are restored.
- The original randomized question order is restored.
- A new attempt is created only when no active attempt exists.

**Status:** Implemented.

### FR-021 - Mock Timer Cannot Pause

Mock Exam time shall continue while the learner is away.

**Implemented behavior:**
- Server-side `startedAt` and configured Time Limit determine remaining time.
- Browser refresh, app closure, tab backgrounding, or temporary disconnection do not reset the timer.
- Resume calculates remaining time from the original start time.

**Status:** Implemented.

### FR-022 - Automatic Submission at Expiry

When Mock time reaches zero, the attempt shall no longer accept normal answer changes and shall be submitted/scored.

**Implemented behavior:**
- Client timer derives from an absolute deadline.
- Server rejects autosave changes after expiry.
- Client triggers final submission at zero.
- If learner returns after expiry, the server finalizes the saved attempt and redirects to results.
- Saved unanswered questions remain Unanswered.

**Status:** Implemented.

### FR-023 - Mock Autosave

Mock answers and Mark for Review state shall be automatically persisted.

**Implemented behavior:**
- Changed answers/marks are autosaved shortly after change.
- Best-effort save also runs when the app/tab is backgrounded.
- Resume restores persisted state.

**Status:** Implemented.

### FR-024 - Free Navigation During Attempt

Learners shall be able to navigate between Mock questions before submission.

**Implemented behavior:**
- Previous/Next navigation is supported.
- Question navigator/palette allows direct jumps.
- Answers may be changed before final submission.
- Unanswered questions can be revisited.

**Status:** Implemented.

### FR-025 - Mark for Review

Learners shall be able to mark questions for later review.

**Implemented behavior:**
- Mark/Unmark is supported during traditional full Mock attempts.
- Navigator visibly identifies marked questions.
- Mark state is autosaved.
- Mark state is preserved in the historical attempt after submission.

**Status:** Implemented.

### FR-026 - Early Submission Confirmation

Before an early final submission, the system shall display a summary.

**Implemented summary:**
- Answered
- Unanswered
- Marked for Review

**Implemented actions:**
- Return/review the exam
- Final Submit

**Status:** Implemented.

### FR-027 - No Answer Explanations During Full Mock

Correctness and explanations shall not be revealed during a full timed Mock Exam.

**Implemented behavior:**
- Full Mock UI disables immediate feedback.
- Server feedback endpoint rejects requests for full Mock feedback before submission.
- Final scoring and explanations become available only after submission.

**Status:** Implemented.

### FR-028 - Attempt-Wise Score History

The learner Mock Exam list shall show attempt-wise history.

**Implemented behavior:**
- Attempt 1, Attempt 2, Attempt 3, etc. are shown independently.
- Each completed attempt displays its score.
- Each historical attempt links to its exact result/review screen.
- Latest score is also displayed where applicable.

**Status:** Implemented.

### FR-029 - Resume Indicator on Mock List

If a Mock has an active attempt, the learner shall be shown Resume Exam rather than Start/Retake.

**Implemented behavior:**
- Active attempt is detected.
- Attempt-in-progress notice is displayed.
- Button changes to Resume Exam.
- Notice states that the timer continues while the learner is away.

**Status:** Implemented.

### FR-030 - Final Review Filters

Post-exam review shall support the agreed filters.

**Implemented filters for Mock Exam:**
- All
- Correct
- Incorrect
- Unanswered
- Marked for Review

**Implemented behavior:**
- Marked for Review is an overlapping flag; a marked Question can also be Correct or Incorrect.
- Marked questions show a Marked for Review badge in historical review.
- There is no separate Answered or Skipped filter.

**Status:** Implemented.

### FR-031 - Domain-Wise Result Performance

Mock results shall display Domain performance only when the Certification uses Domains.

**Implemented behavior:**
- Certifications configured with Domains show Domain Performance based on the attempted Questions.
- Certifications without Domains show overall performance without a Domain breakdown.
- Missing Domain records are not converted into a fake "General" Domain in the Mock result breakdown.

**Status:** Implemented.

### FR-032 - Admin Mock Question Search Safety

Manual question search from Mock Admin shall be certification-scoped and intended for small corrections.

**Implemented behavior:**
- Search is scoped to the selected Mock's Certification.
- Bulk population guidance directs Admin to the content-aware CSV import workflow.
- Existing legacy Mock assignments remain manageable.

**Status:** Implemented.

### FR-033 - Admin Certification Inventory

Certification Admin shall show content inventory counts.

**Implemented counts:**
- Quiz Questions
- Mock Exam Questions
- Practice Only Questions
- Total Practice Pool

**Implemented behavior:**
- Counts are based on published Questions.
- Practice Pool count represents the combined published Question inventory for the Certification.

**Status:** Implemented.

### FR-034 - Admin Question API Content Filter

The Admin Question API shall support filtering by content classification.

**Implemented values:**
- `QUIZ`
- `MOCK_EXAM`
- `PRACTICE_ONLY`

This capability supports detailed Admin management without introducing a learner-facing Practice content-type filter.

**Status:** Implemented.

### FR-035 - CSV UI Consistency

The import screen shall accurately describe the supported upload type and final import state.

**Implemented behavior:**
- Screen now says CSV rather than CSV/Excel.
- Success message identifies whether imported Questions were created as Published or Draft.
- Mock import result identifies the Mock assignment and reminds Admin that a newly created Mock remains Draft.

**Status:** Implemented.

## 5. Data Model Requirements Implemented

### 5.1 Certification

Added:

```
usesDomains Boolean @default(true)
```

Purpose:
- Controls whether Domain classification/filtering is applicable for that Certification.

### 5.2 Question

Added enum:

```
QuestionContentType
- QUIZ
- MOCK_EXAM
- PRACTICE_ONLY
```

Added field:

```
contentType QuestionContentType @default(QUIZ)
```

Added index covering:
- Certification
- Content Type
- Question Status

### 5.3 Existing Mock Assignment Model

The existing `MockExamQuestion` relation remains the authoritative assignment between a Question and a Mock Exam.

A Question can remain in the Question Bank/Practice even after its `MockExamQuestion` assignment is removed.

## 6. Database Migration

The implemented schema requires the Supabase/PostgreSQL migration that:

1. Creates the `QuestionContentType` enum.
2. Adds `Certification.usesDomains`.
3. Adds `Question.contentType`.
4. Adds the content-type/status index.

Existing data defaults:
- Existing Certifications -> `usesDomains = true`
- Existing Questions -> `contentType = QUIZ`

No existing Question data is deleted by this migration.

## 7. Key Business Rules

1. **Practice is the superset.** Every published Question is Practice eligible.
2. **Content Type is primarily an Admin/import classification.** Learners do not filter Practice by Quiz/Mock/Practice Only.
3. **Quiz uses only Quiz-classified Questions.**
4. **Mock membership is fixed; attempt order is variable.**
5. **Option order is fixed.**
6. **Mock timer never pauses.**
7. **One active Mock attempt is resumed rather than replaced.**
8. **Removing from Mock is not deleting the Question.**
9. **A published Mock must have exactly its configured target count of published Questions.**
10. **Results/explanations for full Mock Exams are available only after final submission.**

## 8. Implementation/Deployment Status

The requirements in this document have been implemented in the project branch:

`claude/cpmai-exam-platform-dg2pob`

The application build was verified successfully through the project's Vercel status after the implementation commits.

**Database dependency:** the Supabase migration must be applied to the target database before code paths relying on `usesDomains` and `contentType` can operate in that environment.

## 9. Acceptance Scenarios

### Scenario A - CPMAI Quiz Content

Given CPMAI uses Domains and Admin imports 60 Quiz questions for one Domain:

- Import requires Domain.
- Questions are classified as Quiz.
- Six 10-question Quiz sets are created logically.
- All 60 are also available in Practice.

### Scenario B - Full Mock 120

Given Admin creates a 120-question, 120-minute Mock:

- Exactly 120 valid questions must be imported to fill it.
- Mock remains Draft until explicitly published.
- Every attempt contains the same 120 Questions.
- Question order changes for each new attempt.
- Answer choices remain in original order.
- Timer continues if user closes the app.
- Returning resumes the active attempt and its exact question order.
- Score/explanations are visible only after submission.

### Scenario C - Expand Mock

Given an existing 120-question Mock is changed to target 150:

- Admin may set target to 150.
- System reports 30 missing.
- Incremental Mock import must contain exactly 30 valid Questions.
- Import is atomic.

### Scenario D - Reduce Mock

Given 150 Questions are assigned and Admin wants a 120-question Mock:

- Directly changing target to 120 is rejected.
- Admin removes 30 Mock assignments first and saves.
- Removed Questions remain in Practice.
- Admin can then reduce target to 120.

### Scenario E - Certification Without Domains

Given a Certification is configured with `usesDomains = false`:

- Domain does not block Question import.
- Practice does not show a Domain filter for that Certification.
- Mock results show overall performance without Domain Performance.

### Scenario F - Unified Practice Pool

Given a Certification has:
- 340 Quiz Questions,
- 240 Mock Exam Questions,
- 100 Practice Only Questions,

the Practice pool contains 680 published Questions, with no learner-facing content-type filter.

## 10. Out of Scope for This As-Built Document

This document does not claim implementation of unrelated future enhancements such as:

- fuzzy/text-based duplicate detection,
- automatic cross-Mock duplicate blocking,
- arbitrary learner filtering of Practice by content origin,
- automatic migration of legacy Question classifications beyond the defined defaults,
- new Topic administration rules beyond current optional Topic behavior.

---

**End of Document**


## Deployment Note — 20 September 2026

The required Supabase schema migration for `Certification.usesDomains` and `Question.contentType` was confirmed as applied before production deployment of this implementation.
