# QA Issue Register

This file tracks product/software issues found during CertMocks testing and code review.
Question-content quality is intentionally outside this register.

## Status legend

- **Open** — confirmed issue, not fixed yet
- **Fixed** — code change completed
- **Verified** — fix has been manually/regression tested
- **Monitor** — fixed, but worth watching for recurrence

## Issues

| ID | Area | Issue | Status | Fix / evidence |
| --- | --- | --- | --- | --- |
| QA-001 | Mock exam cards | Untimed label appeared on the Mock Exams listing even though it should appear only inside the active exam where relevant. | Verified | Fixed in `a1881f37e47262317aef5d6872b6ef8f3cdcb2ad`; user confirmed. |
| QA-002 | Learning mock feedback | Explanation/feedback was not reliably visible immediately after checking an answer. | Verified | Feedback flow corrected; user confirmed old issue fixed. |
| QA-003 | Results review | Correct/incorrect/unanswered review needed filters and filter changes could move focus unexpectedly. | Fixed | Review filters added and focus behavior corrected during the review-flow work. |
| QA-004 | Learning mock navigation | Mark-for-review was unnecessary for immediate-feedback domain mocks and complicated the missed-question flow. | Fixed | Flow changed to review unanswered/missed questions rather than marked questions. |
| QA-005 | Review unanswered | Review could fall back to sequential questions instead of moving only through missed questions. | Verified | Consolidated review navigation fix through `c8c74911d5e867a8ef3809fb1c1758daf9ef1939`; user reported flow seems fixed. |
| QA-006 | Attempt state | Answers could appear preselected because draft/autosaved selections and checked answers were not represented consistently. | Verified | Draft vs checked state separated and resume behavior corrected; consolidated through `c8c74911d5e867a8ef3809fb1c1758daf9ef1939`. |
| QA-007 | Submit review | Submitting early could report only one unanswered question instead of all unfinished questions. | Verified | Unfinished-question calculation corrected in consolidated learning-mock flow. |
| QA-008 | Last-question review | Q10 reviewed from the missed-question flow could re-open review or submit unexpectedly instead of completing the review sequence. | Verified | Fixed review-mode completion and submission boundaries; user confirmed flow seems fixed. |
| QA-009 | Scoring | Selected-but-unchecked draft answers could be treated differently by UI and server scoring. | Fixed | Server scoring now treats only checked answers as completed for immediate-feedback mocks. |
| QA-010 | Autosave | Autosave could race with Check Answer/feedback locking and interfere with later saves. | Fixed | Autosave made idempotent around feedback locks. |
| QA-011 | Resume | Checked answers could restore after refresh without restoring their Key Idea/explanation feedback. | Fixed | Feedback is rehydrated for checked answers on resume. |
| QA-012 | Next attempt selection | Previously unanswered questions could be omitted from the missed-question priority for later attempts. | Fixed | Unanswered and incorrect history are both classified as missed before unseen/correct questions. |
| QA-013 | Dashboard statistics | Questions Done summed every attempt, so 7 ten-question attempts displayed 70 even when the pool contained only 60 questions. | Fixed | Dashboard now counts unique question IDs with an actual selected answer; fixed in `9060156fa03aa1c70c5d4ef712ee4b8070765a27`. |

## End-of-cycle verification

Before release sign-off, re-test every row marked **Fixed** or **Monitor** and change it to **Verified** only after reproducing the expected behavior in the deployed application.

When a new software issue is found, add it here with the next QA number, reproduction summary, status, and fixing commit. Do not remove resolved issues; keeping them provides a regression history.
