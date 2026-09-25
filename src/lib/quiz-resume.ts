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
  _savedIndex: number | undefined,
  selectedAnswers: Array<string | null | undefined>,
): number {
  // Resume consistently at the earliest unfinished work. A persisted UI
  // position can point at an already-answered question (for example when the
  // learner answers Q1 and leaves before tapping Next), which made Quiz resume
  // appear to restart at Q1 even though the answer itself was restored.
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
