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
