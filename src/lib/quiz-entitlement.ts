export type QuizAccessTier = 'FREE' | 'PAID'
export type QuizSessionKind = 'STANDARD' | 'INCORRECT_RETRY' | 'MIXED_REVIEW'

export interface QuizAttemptConfig {
  quizKey: string
  quizTitle?: string
  accessTier?: QuizAccessTier
  quizNumber?: number
  sessionKind?: QuizSessionKind
  questionIds?: string[]
}

export function readQuizAttemptConfig(value: unknown): QuizAttemptConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  const quizKey = typeof record.quizKey === 'string' ? record.quizKey : ''
  if (!/^(domain|tag):[A-Za-z0-9_-]+$/.test(quizKey)) return null

  const quizNumber =
    typeof record.quizNumber === 'number' &&
    Number.isInteger(record.quizNumber) &&
    record.quizNumber > 0 &&
    record.quizNumber <= 100
      ? record.quizNumber
      : undefined

  const sessionKind: QuizSessionKind | undefined =
    record.sessionKind === 'STANDARD' ||
    record.sessionKind === 'INCORRECT_RETRY' ||
    record.sessionKind === 'MIXED_REVIEW'
      ? record.sessionKind
      : undefined

  const questionIds = Array.isArray(record.questionIds)
    ? Array.from(new Set(
        record.questionIds.filter(
          (item): item is string => typeof item === 'string' && item.length > 0
        )
      ))
    : undefined

  return {
    quizKey,
    quizTitle: typeof record.quizTitle === 'string' ? record.quizTitle : undefined,
    accessTier:
      record.accessTier === 'FREE' || record.accessTier === 'PAID'
        ? record.accessTier
        : undefined,
    quizNumber,
    sessionKind,
    questionIds: questionIds && questionIds.length > 0 ? questionIds : undefined,
  }
}

export interface QuizAttemptState {
  id: string
  status: string
}

export function freeQuizAttemptState(attempts: QuizAttemptState[]) {
  const consumed = attempts.some((attempt) => attempt.status !== 'IN_PROGRESS')
  if (consumed) return { locked: true, activeAttemptId: null as string | null }

  const active = attempts.find((attempt) => attempt.status === 'IN_PROGRESS')
  return { locked: false, activeAttemptId: active?.id ?? null }
}

export function quizCountForQuestions(total: number, perQuiz = 10) {
  if (total <= 0 || perQuiz <= 0) return 0
  return Math.ceil(total / perQuiz)
}

export function questionCountForQuiz(total: number, quizNumber: number, perQuiz = 10) {
  if (total <= 0 || perQuiz <= 0 || quizNumber <= 0) return 0
  const remaining = total - (quizNumber - 1) * perQuiz
  return Math.max(0, Math.min(perQuiz, remaining))
}

export function fixedQuizQuestionSet(
  existingQuestionIds: string[],
  poolQuestionIds: string[],
  usedByOtherQuizzes: string[],
  budget: number,
) {
  if (budget <= 0) return []

  const pool = new Set(poolQuestionIds)
  const used = new Set(usedByOtherQuizzes)
  const selected: string[] = []
  const selectedSet = new Set<string>()

  const add = (id: string) => {
    if (!pool.has(id) || selectedSet.has(id) || selected.length >= budget) return
    selected.push(id)
    selectedSet.add(id)
  }

  existingQuestionIds.forEach(add)

  for (const id of poolQuestionIds) {
    if (!used.has(id)) add(id)
  }

  // This fallback matters only for legacy data or a pool that was reduced after
  // quizzes were assigned. New six-quiz flows never overlap while enough
  // unassigned questions remain.
  for (const id of poolQuestionIds) add(id)

  return selected.slice(0, budget)
}

export function previousQuizAllowsNext(
  hasSuccessfulCompletion: boolean,
  hasActiveRetake: boolean,
): boolean {
  return hasSuccessfulCompletion && !hasActiveRetake
}


export interface QuizProgressAttempt {
  status: string
  totalQuestions: number
  unansweredCount: number | null
  answers: { questionId: string; isCorrect: boolean | null }[]
}

export function isFullyAnsweredQuizAttempt(attempt: QuizProgressAttempt): boolean {
  if (attempt.status !== 'COMPLETED') return false
  if (attempt.unansweredCount !== null) return attempt.unansweredCount === 0

  const checked = attempt.answers.filter((answer) => answer.isCorrect !== null).length
  return attempt.totalQuestions > 0 && checked >= attempt.totalQuestions
}

export function latestQuizVerdicts(
  attempts: { answers: { questionId: string; isCorrect: boolean | null }[] }[],
) {
  const latest = new Map<string, boolean>()
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      if (answer.isCorrect !== null) {
        latest.set(answer.questionId, answer.isCorrect === true)
      }
    }
  }
  return latest
}


export function countsAsFullQuizAttempt(sessionKind: QuizSessionKind): boolean {
  return sessionKind === 'STANDARD'
}


export function isQuizMastered(
  questionIds: string[],
  verdicts: Map<string, boolean>,
): boolean {
  return questionIds.length > 0 &&
    questionIds.every((questionId) => verdicts.get(questionId) === true)
}
