export function resumeQuestionIndex(
  questionIds: string[],
  completedQuestionIds: Iterable<string>,
): number {
  if (questionIds.length === 0) return 0

  const completed = new Set(completedQuestionIds)
  const firstIncomplete = questionIds.findIndex((id) => !completed.has(id))

  return firstIncomplete >= 0 ? firstIncomplete : questionIds.length - 1
}
