export interface ExpandableQuizSlot {
  number: number
  completed: boolean
  lockReason: string | null
  activeAttemptId: string | null
  activeRetryAttemptId: string | null
}

export interface ExpandableQuizDomain {
  key: string
  slots: ExpandableQuizSlot[]
}

export function quizSlotExpansionKey(quizKey: string, quizNumber: number) {
  return quizKey + ':' + quizNumber
}

export function initialExpandedQuizSlotKeys(
  quizzes: ExpandableQuizDomain[],
): string[] {
  const expanded: string[] = []

  for (const quiz of quizzes) {
    const active = quiz.slots.find(
      (slot) => slot.activeAttemptId || slot.activeRetryAttemptId
    )
    const nextActionable = quiz.slots.find(
      (slot) => !slot.completed && slot.lockReason === null
    )
    const slot = active ?? nextActionable
    if (slot) expanded.push(quizSlotExpansionKey(quiz.key, slot.number))
  }

  return expanded
}


export interface QuizSlotStatusInput {
  completed: boolean
  attemptCount: number
  activeAttemptId: string | null
  activeRetryAttemptId: string | null
  lockReason: string | null
  number: number
  premiumAccess: boolean
}

export function quizSlotStatusLabel(slot: QuizSlotStatusInput): string | null {
  // Completion is a permanent milestone. A later/stale in-progress attempt
  // must never hide the Completed badge once this quiz has been mastered.
  if (slot.completed) return 'Completed'
  if (slot.activeAttemptId || slot.activeRetryAttemptId) return null
  if (slot.attemptCount > 0) return 'Keep Practicing'
  if (slot.number === 1 && !slot.premiumAccess) return 'Free'
  if (slot.lockReason) return null
  return 'Available'
}
