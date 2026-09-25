export interface MockAttemptHistoryItem {
  id: string
  startedAt: Date
}

export function newestMockAttemptsFirst<T extends MockAttemptHistoryItem>(
  attempts: T[],
): T[] {
  return [...attempts].sort((a, b) => {
    const startedAtDifference = b.startedAt.getTime() - a.startedAt.getTime()
    if (startedAtDifference !== 0) return startedAtDifference
    return b.id.localeCompare(a.id)
  })
}
