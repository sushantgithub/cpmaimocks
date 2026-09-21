export interface MockExamShape {
  questionCount: number
  questionsPerAttempt: number | null
  timeLimitMinutes: number
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
 * derived from question count so the new 40-question/full-length layout can
 * ship without a database migration. If CertMocks later supports more formal
 * exam formats, this can be replaced by an explicit persisted type.
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
