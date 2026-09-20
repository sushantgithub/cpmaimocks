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
