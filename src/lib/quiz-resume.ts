export function firstUnansweredQuestionIndex(
  selectedAnswers: Array<string | null | undefined>,
): number {
  if (selectedAnswers.length === 0) return 0

  const unanswered = selectedAnswers.findIndex(
    (answer) => typeof answer !== 'string' || answer.trim().length === 0,
  )

  return unanswered >= 0 ? unanswered : selectedAnswers.length - 1
}

export function resolveQuizResumeQuestionIndex(
  savedIndex: number | undefined,
  selectedAnswers: Array<string | null | undefined>,
): number {
  if (selectedAnswers.length === 0) return 0

  if (
    typeof savedIndex === 'number' &&
    Number.isInteger(savedIndex) &&
    savedIndex >= 0 &&
    savedIndex < selectedAnswers.length
  ) {
    return savedIndex
  }

  return firstUnansweredQuestionIndex(selectedAnswers)
}

export function mergeQuizResumePosition(
  practiceConfig: unknown,
  questionIndex: number,
): Record<string, unknown> {
  const config =
    practiceConfig &&
    typeof practiceConfig === 'object' &&
    !Array.isArray(practiceConfig)
      ? practiceConfig as Record<string, unknown>
      : {}

  return {
    ...config,
    resumeQuestionIndex: questionIndex,
  }
}
