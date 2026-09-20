export interface FreeQuizState {
  locked: boolean
  mastered: boolean
}

/**
 * A free account has something useful to continue only when at least one
 * currently published quiz is neither exhausted nor already mastered.
 */
export function hasRemainingFreeQuizSession(quizzes: FreeQuizState[]): boolean {
  return quizzes.some((quiz) => !quiz.locked && !quiz.mastered)
}
