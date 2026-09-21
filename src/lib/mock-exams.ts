export interface MockExamShape {
  questionCount: number
  questionsPerAttempt: number | null
  timeLimitMinutes: number
}

export interface MockExamOrderShape {
  id?: string
  title: string
  sortOrder: number
  questionCount: number
  certification?: { sortOrder?: number | null } | null
}

/**
 * A real mock exam is timed and serves its full linked question set.
 * Legacy domain learning mocks sampled a smaller set (for example 10 of 60)
 * and are now represented by the dedicated Quiz 1–6 experience instead.
 */
export function isFullMockExam(exam: MockExamShape): boolean {
  const servesFullPool =
    exam.questionsPerAttempt === null ||
    exam.questionsPerAttempt <= 0 ||
    exam.questionsPerAttempt >= exam.questionCount

  return exam.questionCount > 0 && exam.timeLimitMinutes > 0 && servesFullPool
}

export type MockExamDisplayGroup = 'FORTY_QUESTION' | 'FULL_LENGTH' | 'OTHER'

/**
 * Presentation grouping for the Mock Exams page. This is intentionally
 * derived from question count so the 40-question/full-length layout works
 * without a schema migration.
 */
export function mockExamDisplayGroup(questionCount: number): MockExamDisplayGroup {
  if (questionCount === 40) return 'FORTY_QUESTION'
  if (questionCount >= 100) return 'FULL_LENGTH'
  return 'OTHER'
}

export function mockExamDisplayLabel(questionCount: number): string {
  const group = mockExamDisplayGroup(questionCount)
  if (group === 'FORTY_QUESTION') return '40-Question Mock'
  if (group === 'FULL_LENGTH') return 'Full-Length Mock'
  return 'Mock Exam'
}

export function normalizeMockExamTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function hasDuplicateMockExamTitle(
  title: string,
  exams: Array<{ id?: string; title: string }>,
  excludeId?: string,
): boolean {
  const normalized = normalizeMockExamTitle(title)
  return exams.some(
    (exam) =>
      exam.id !== excludeId &&
      normalizeMockExamTitle(exam.title) === normalized,
  )
}

/**
 * Existing CertMocks records historically used sortOrder=0. For those rows,
 * recover the intended display number from a trailing integer in the title
 * (e.g. "PMI-CPMAI Practice Exam 5" -> 5). New/edited records persist a real
 * positive sortOrder so later renames do not change their position.
 */
export function mockNumberFromTitle(title: string): number | null {
  const match = title.trim().match(/(?:^|\D)(\d+)\s*$/)
  if (!match) return null

  const value = Number(match[1])
  return Number.isInteger(value) && value > 0 ? value : null
}

export function effectiveMockSortOrder(
  exam: Pick<MockExamOrderShape, 'title' | 'sortOrder'>,
): number {
  if (Number.isInteger(exam.sortOrder) && exam.sortOrder > 0) {
    return exam.sortOrder
  }
  return mockNumberFromTitle(exam.title) ?? Number.MAX_SAFE_INTEGER
}

function groupRank(questionCount: number): number {
  const group = mockExamDisplayGroup(questionCount)
  if (group === 'FORTY_QUESTION') return 0
  if (group === 'FULL_LENGTH') return 1
  return 2
}

export function compareMockExamsForDisplay(
  a: MockExamOrderShape,
  b: MockExamOrderShape,
): number {
  const certificationCompare =
    (a.certification?.sortOrder ?? 0) - (b.certification?.sortOrder ?? 0)
  if (certificationCompare !== 0) return certificationCompare

  const groupCompare = groupRank(a.questionCount) - groupRank(b.questionCount)
  if (groupCompare !== 0) return groupCompare

  const orderCompare = effectiveMockSortOrder(a) - effectiveMockSortOrder(b)
  if (orderCompare !== 0) return orderCompare

  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortMockExamsForDisplay<T extends MockExamOrderShape>(
  exams: T[],
): T[] {
  return [...exams].sort(compareMockExamsForDisplay)
}

export function chooseMockSortOrder(
  title: string,
  existing: Array<Pick<MockExamOrderShape, 'title' | 'sortOrder'>>,
): number {
  const used = new Set(existing.map(effectiveMockSortOrder).filter(Number.isFinite))
  const requested = mockNumberFromTitle(title)

  if (requested && !used.has(requested)) return requested

  let next = 1
  while (used.has(next)) next += 1
  return next
}
