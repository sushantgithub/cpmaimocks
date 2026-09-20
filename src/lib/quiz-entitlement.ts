export type QuizAccessTier = 'FREE' | 'PAID'

export interface QuizAttemptConfig {
  quizKey: string
  quizTitle?: string
  accessTier?: QuizAccessTier
}

export function readQuizAttemptConfig(value: unknown): QuizAttemptConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const quizKey = typeof record.quizKey === 'string' ? record.quizKey : ''
  if (!/^(domain|tag):[A-Za-z0-9_-]+$/.test(quizKey)) return null

  return {
    quizKey,
    quizTitle: typeof record.quizTitle === 'string' ? record.quizTitle : undefined,
    accessTier: record.accessTier === 'FREE' || record.accessTier === 'PAID'
      ? record.accessTier
      : undefined,
  }
}

export interface QuizAttemptState {
  id: string
  status: string
}

export function freeQuizAttemptState(attempts: QuizAttemptState[]) {
  // Once a free sitting is completed or abandoned, it is consumed. An active
  // sitting remains resumable so closing/reloading does not burn the allowance.
  const consumed = attempts.some((attempt) => attempt.status !== 'IN_PROGRESS')
  if (consumed) return { locked: true, activeAttemptId: null as string | null }

  const active = attempts.find((attempt) => attempt.status === 'IN_PROGRESS')
  return { locked: false, activeAttemptId: active?.id ?? null }
}
