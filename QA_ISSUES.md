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
| QA-013 | Dashboard statistics | **Questions Done exceeded the available question pool.** The dashboard added the question count from every completed attempt, so repeated questions were counted multiple times (for example, seven 10-question attempts displayed 70 even though the pool contains 60). | Fixed | Dashboard now counts unique question IDs that the learner actually attempted. Repeating a question no longer increases this metric. Fixed in `9060156fa03aa1c70c5d4ef712ee4b8070765a27`. |
| QA-014 | Review unanswered | **Review could loop after partially answering the review queue.** Reproduction: skip all 10 questions, start **Review Unanswered**, answer/check Q1, Q3, Q5, Q7 and Q9 while skipping the even-numbered questions. After Q9, **Next Unanswered** could be pressed repeatedly and the review did not reach a clear end/submit state. Expected: review should make one forward pass through the captured unanswered queue and, after its final item, show the final submission confirmation; questions deliberately left unanswered remain reported as unanswered. | Fixed | Review now uses a stable, forward-only queue captured when review starts. It never wraps back to an earlier question, and the last review item transitions to final submission confirmation. Regression test updated in `3e80d4d83aa19d72f0aa1d324dfee0844fa08a4a`. |

| QA-015 | Exam launch / attempt state | **A new exam launched from the Dashboard could resume an old in-progress attempt and show a previously selected answer on Q1.** Reproduction: leave a domain mock in progress with at least one checked answer, return to Dashboard, then press **Start Exam**. The Dashboard used `/exams/{id}` (resume semantics) while the Mock Exams page used `?fresh=1` (fresh-attempt semantics), so identical-looking start actions behaved differently. Expected: intentional start/continue actions create a clean attempt with no preselected answers; direct refresh/resume keeps the current attempt. | Fixed | Both Dashboard and Mock Exams now use the shared `freshExamHref()` launch path. Fresh-launch links disable Next.js prefetch so merely viewing a page cannot trigger the server-side fresh-attempt transition. Direct `/exams/{id}` remains the resume path. Fixed through `d6eb00142e3db1acede1a8438aff61efe176a5d7`. |

| QA-016 | Dashboard statistics | **“Questions Done” was ambiguous and could be mistaken for questions answered correctly.** The value actually represented unique questions attempted at least once, regardless of whether the answer was correct or incorrect. Expected: label the metric clearly as **Questions Attempted** and provide a separate **Questions Mastered** metric for unique questions answered correctly at least once. | Fixed | Dashboard now shows **Questions Attempted** for unique attempted questions and **Questions Mastered** for unique questions with at least one correct completed answer. Both labels include a mobile-friendly info control explaining exactly what is counted. |

| QA-017 | Progress consistency | **Dashboard and Quiz progress used different definitions of an answered question.** The Dashboard counted only selected answers from completed attempts, while Quizzes counted any persisted selection, including draft or abandoned rows. This could show values such as **38 Questions Attempted** on Dashboard but **39 of 60 answered** on Quizzes. The Dashboard mastery metric also meant “ever correct,” while Quiz revisit logic uses the latest verdict. Expected: progress should be based on checked/scored answers, draft selections should not count, and the latest verdict should determine current mastery. | Fixed | Dashboard and Quiz progress now both ignore rows without a correctness verdict. Dashboard **Questions Attempted** counts unique checked/scored questions, and **Questions Mastered** counts unique questions whose latest checked verdict is correct. Regression coverage was added for latest-verdict behavior. |

## End-of-cycle verification

Before release sign-off, re-test every row marked **Fixed** or **Monitor** and change it to **Verified** only after reproducing the expected behavior in the deployed application.

When a new software issue is found, add it here with the next QA number, reproduction summary, status, and fixing commit. Do not remove resolved issues; keeping them provides a regression history.
