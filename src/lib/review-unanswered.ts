export function buildUnansweredQueue(
  questionIds: string[],
  answers: Record<string, string>,
): number[] {
  return questionIds
    .map((questionId, index) => ({ questionId, index }))
    .filter(({ questionId }) => !answers[questionId])
    .map(({ index }) => index)
}

export function reviewQueueTarget(
  queue: number[],
  cursor: number,
  direction: -1 | 1,
): { cursor: number; questionIndex: number } | null {
  const nextCursor = cursor + direction
  if (nextCursor < 0 || nextCursor >= queue.length) return null

  return {
    cursor: nextCursor,
    questionIndex: queue[nextCursor],
  }
}


export function finishNeedsConfirmation(unansweredCount: number): boolean {
  return unansweredCount > 0
}
