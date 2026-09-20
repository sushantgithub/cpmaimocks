export const FREE_PRACTICE_QUESTION_LIMIT = 25

export interface PracticeAttemptUsage {
  totalQuestions: number
  practiceConfig: unknown
}

export interface FreePracticeAccess {
  limit: number
  used: number
  remaining: number
}

export function practiceCertificationId(practiceConfig: unknown): string | null {
  if (!practiceConfig || typeof practiceConfig !== 'object' || Array.isArray(practiceConfig)) {
    return null
  }

  const certificationId = (practiceConfig as { certificationId?: unknown }).certificationId
  return typeof certificationId === 'string' && certificationId.trim().length > 0
    ? certificationId
    : null
}

export function countFreePracticeUsage(
  attempts: PracticeAttemptUsage[],
  certificationId: string
): number {
  return attempts.reduce((total, attempt) => {
    if (practiceCertificationId(attempt.practiceConfig) !== certificationId) return total
    return total + Math.max(0, Math.floor(attempt.totalQuestions))
  }, 0)
}

export function getFreePracticeAccess(usedQuestions: number): FreePracticeAccess {
  const normalizedUsed = Math.max(0, Math.floor(usedQuestions))
  return {
    limit: FREE_PRACTICE_QUESTION_LIMIT,
    used: Math.min(FREE_PRACTICE_QUESTION_LIMIT, normalizedUsed),
    remaining: Math.max(0, FREE_PRACTICE_QUESTION_LIMIT - normalizedUsed),
  }
}
