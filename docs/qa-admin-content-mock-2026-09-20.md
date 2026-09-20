# CertMocks Admin/Mock QA — 20 September 2026

## Scope completed

This QA pass covers the pending Admin UI cleanup and regression checks after the content-model and Mock Exam implementation.

### UI fixes completed
- Existing Mock import selection now shows a mobile-friendly summary: Assigned/Target, Missing, Time, Pass, Status/Access, and exact next CSV requirement.
- Domain Admin rows now reflow on mobile. Domain name/count remain readable and merge/edit/delete controls no longer force page-level horizontal scrolling.
- Domain creation controls stack on narrow screens.
- Certification cards now stack actions on mobile so inventory counts remain readable.
- Mock Exams Admin is renamed consistently from Exams/New Exam to Mock Exams/New Mock Exam.
- New Mock Admin form now includes the required Question Count and sends it to the API.
- Mock cards show Assigned/Target, Missing, Time, Pass, Attempts, Free/Paid, and Draft/Published state.
- Incomplete Mock Exams cannot be published from the UI and the server remains authoritative.
- Legacy untimed domain learning-mock records remain hidden from Mock Exams.
- Certification Mock Exam counts now exclude those hidden legacy records.
- Generated Domain Quizzes remain visible under Admin > Quizzes.

## Regression safeguards checked

- A timed full 120-question Mock is classified as a real Mock.
- A timed full 50-question Mini Mock is classified as a real Mock.
- Untimed legacy domain pools are not classified as Mock Exams.
- Timed sampled legacy pools are not classified as full Mock Exams.
- Empty timed records are not classified as Mock Exams.
- 60 Quiz questions produce 6 Quiz slots of 10.
- Partial Quiz pools are handled correctly (25 -> 10/10/5; 64 -> final slot of 4).

## Automated validation

GitHub CI for the completed UI/API changes passed:
- npm install
- Prisma client generation
- TypeScript type check
- Vitest unit tests
- Next.js production build

Vercel preview build also passed before production deployment.

## Live verification after deployment

Production smoke checks should confirm:
1. Admin > Certifications shows Quiz/Mock/Practice-only/Practice Pool and the visible Mock Exam count.
2. Admin > Domains has no page-level horizontal overflow on mobile.
3. Admin > Quizzes shows the generated Domain Quiz structure.
4. Admin > Mock Exams contains only genuine timed full-set Mocks.
5. Bulk Import > Mock Exam > Existing Mock displays the new selected-Mock summary.
6. Creating a Draft Mock from Admin requires Question Count and produces a Draft Mock.
7. Publishing is blocked until Assigned equals Target.

Authenticated learner end-to-end behavior (start/resume/timer/autosave/submit/results/history) still requires a signed-in learner session for a live browser test; the underlying code paths and build/unit checks are covered by CI.
