import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds, hasAccessToCertification } from '@/lib/subscription'
import {
  fixedQuizQuestionSet,
  freeQuizAttemptState,
  questionCountForQuiz,
  quizCountForQuestions,
  readQuizAttemptConfig,
  type QuizAccessTier,
  type QuizAttemptConfig,
  type QuizSessionKind,
} from '@/lib/quiz-entitlement'

export const QUIZ_QUESTIONS_PER_SITTING = 10
export const QUIZ_FREE_QUESTION_LIMIT = 10

export type QuizKey = string
export type QuizStartAction = 'start' | 'retake' | 'retryIncorrect' | 'mixedReview'
export type QuizLockReason = 'SUBSCRIPTION' | 'PREVIOUS' | 'FREE_USED' | null

export interface QuizAttemptHistory {
  id: string
  score: number
  submittedAt: string
  incorrectCount: number
}

export interface QuizSlotSummary {
  number: number
  questionCount: number
  completed: boolean
  activeAttemptId: string | null
  latestAttemptId: string | null
  latestScore: number | null
  bestScore: number | null
  latestIncorrect: number
  attemptCount: number
  history: QuizAttemptHistory[]
  lockReason: QuizLockReason
}

export interface QuizSummary {
  key: QuizKey
  title: string
  description: string | null
  certificationId: string
  certificationName: string
  total: number
  answered: number
  wrong: number
  mastered: boolean
  locked: boolean
  activeAttemptId: string | null
  premiumAccess: boolean
  quizCount: number
  completedQuizzes: number
  mixedReviewAvailable: boolean
  slots: QuizSlotSummary[]
}

interface QuizAttemptRow {
  id: string
  status: string
  createdAt: Date
  submittedAt: Date | null
  score: number | null
  correctCount: number | null
  incorrectCount: number | null
  practiceConfig: unknown
  answers: {
    questionId: string
    isCorrect: boolean | null
  }[]
}

interface NormalizedAttempt extends QuizAttemptRow {
  config: QuizAttemptConfig
  quizNumber: number | null
  sessionKind: QuizSessionKind
}

function domainKey(categoryId: string): QuizKey {
  return 'domain:' + categoryId
}

function tagKey(quizId: string): QuizKey {
  return 'tag:' + quizId
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

async function poolFilter(key: QuizKey) {
  const [kind, id] = key.split(':')
  if (kind === 'domain') {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { certification: { select: { id: true, name: true } } },
    })
    if (!category) return null

    const claimed = await prisma.quiz.findMany({
      where: { isActive: true, certificationId: category.certificationId },
      select: { tag: true },
    })
    const claimedTags = Array.from(new Set(claimed.map((q) => q.tag)))

    return {
      title: category.name,
      description: null as string | null,
      certificationId: category.certificationId,
      certificationName: category.certification.name,
      where: {
        status: 'PUBLISHED' as const,
        categoryId: category.id,
        ...(claimedTags.length > 0 ? { NOT: { tags: { hasSome: claimedTags } } } : {}),
      },
    }
  }

  if (kind === 'tag') {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { certification: { select: { id: true, name: true } } },
    })
    if (!quiz || !quiz.isActive) return null

    return {
      title: quiz.title,
      description: quiz.description,
      certificationId: quiz.certificationId,
      certificationName: quiz.certification.name,
      where: {
        status: 'PUBLISHED' as const,
        certificationId: quiz.certificationId,
        tags: { has: quiz.tag },
      },
    }
  }

  return null
}

async function loadUserQuizAttempts(userId: string): Promise<QuizAttemptRow[]> {
  return prisma.examAttempt.findMany({
    where: { userId, mode: 'QUIZ' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      score: true,
      correctCount: true,
      incorrectCount: true,
      practiceConfig: true,
      answers: {
        select: { questionId: true, isCorrect: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

function normalizeAttemptsForKey(
  attempts: QuizAttemptRow[],
  key: QuizKey,
  quizCount: number,
): NormalizedAttempt[] {
  const keyed = attempts
    .map((attempt) => ({ attempt, config: readQuizAttemptConfig(attempt.practiceConfig) }))
    .filter(
      (item): item is { attempt: QuizAttemptRow; config: QuizAttemptConfig } =>
        item.config?.quizKey === key
    )

  let legacyPaidSlot = 0

  return keyed.map(({ attempt, config }) => {
    const sessionKind = config.sessionKind ?? 'STANDARD'
    let quizNumber = config.quizNumber ?? null

    if (sessionKind === 'STANDARD' && quizNumber === null) {
      if (config.accessTier === 'FREE') {
        quizNumber = 1
      } else {
        legacyPaidSlot = Math.min(Math.max(quizCount, 1), legacyPaidSlot + 1)
        quizNumber = legacyPaidSlot
      }
    }

    return { ...attempt, config, quizNumber, sessionKind }
  })
}

function standardForSlot(attempts: NormalizedAttempt[], quizNumber: number) {
  return attempts.filter(
    (attempt) => attempt.sessionKind === 'STANDARD' && attempt.quizNumber === quizNumber
  )
}

function attemptQuestionIds(attempt: NormalizedAttempt) {
  return attempt.config.questionIds?.length
    ? attempt.config.questionIds
    : attempt.answers.map((answer) => answer.questionId)
}

function canonicalQuestionIds(attempts: NormalizedAttempt[], quizNumber: number) {
  const first = standardForSlot(attempts, quizNumber)[0]
  return first ? attemptQuestionIds(first) : []
}

function latestCompletedStandard(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...standardForSlot(attempts, quizNumber)]
    .reverse()
    .find((attempt) => attempt.status === 'COMPLETED') ?? null
}

function activeStandard(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...standardForSlot(attempts, quizNumber)]
    .reverse()
    .find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
}

function latestLearningVerdicts(attempts: NormalizedAttempt[]) {
  const latest = new Map<string, boolean>()
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      if (answer.isCorrect !== null) latest.set(answer.questionId, answer.isCorrect === true)
    }
  }
  return latest
}

function historyForSlot(attempts: NormalizedAttempt[], quizNumber: number): QuizAttemptHistory[] {
  return standardForSlot(attempts, quizNumber)
    .filter((attempt) => attempt.status === 'COMPLETED')
    .slice()
    .reverse()
    .map((attempt) => ({
      id: attempt.id,
      score: Math.round((attempt.score ?? 0) * 10) / 10,
      submittedAt: (attempt.submittedAt ?? attempt.createdAt).toISOString(),
      incorrectCount:
        attempt.incorrectCount ??
        attempt.answers.filter((answer) => answer.isCorrect === false).length,
    }))
}

function freeSlotState(attempts: NormalizedAttempt[]) {
  return freeQuizAttemptState(
    standardForSlot(attempts, 1).map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
    }))
  )
}

export async function listQuizzes(userId: string): Promise<QuizSummary[]> {
  const [categories, tagQuizzes, attempts, accessible] = await Promise.all([
    prisma.category.findMany({
      where: { certification: { isActive: true } },
      include: { certification: { select: { id: true, name: true, sortOrder: true } } },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
    prisma.quiz.findMany({
      where: { isActive: true, certification: { isActive: true } },
      include: { certification: { select: { id: true, name: true, sortOrder: true } } },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
    loadUserQuizAttempts(userId),
    getAccessibleCertificationIds(userId),
  ])

  const keys: QuizKey[] = [
    ...categories.map((category) => domainKey(category.id)),
    ...tagQuizzes.map((quiz) => tagKey(quiz.id)),
  ]

  const summaries = await Promise.all(
    keys.map((key) => quizSummary(userId, key, attempts, accessible))
  )
  return summaries.filter((summary): summary is QuizSummary => summary !== null && summary.total > 0)
}

export async function quizSummary(
  userId: string,
  key: QuizKey,
  preloadedAttempts?: QuizAttemptRow[],
  accessible?: string[] | 'ALL',
): Promise<QuizSummary | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const ids = questions.map((question) => question.id)
  const quizCount = quizCountForQuestions(ids.length, QUIZ_QUESTIONS_PER_SITTING)
  if (quizCount === 0) return null

  const allAttempts = preloadedAttempts ?? await loadUserQuizAttempts(userId)
  const attempts = normalizeAttemptsForKey(allAttempts, key, quizCount)

  const hasAccess =
    accessible !== undefined
      ? accessible === 'ALL' || accessible.includes(pool.certificationId)
      : await hasAccessToCertification(userId, pool.certificationId)

  const freeState = freeSlotState(attempts)
  const verdicts = latestLearningVerdicts(attempts)
  const answered = Array.from(verdicts.keys()).filter((id) => ids.includes(id)).length
  const wrong = Array.from(verdicts.entries()).filter(
    ([id, correct]) => ids.includes(id) && !correct
  ).length

  const slots: QuizSlotSummary[] = Array.from({ length: quizCount }, (_, index) => {
    const number = index + 1
    const slotAttempts = standardForSlot(attempts, number)
    const active = [...slotAttempts].reverse().find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
    const history = historyForSlot(attempts, number)
    const latest = history[0] ?? null
    const previousCompleted =
      number === 1 || latestCompletedStandard(attempts, number - 1) !== null

    let lockReason: QuizLockReason = null
    if (!hasAccess && number > 1) lockReason = 'SUBSCRIPTION'
    else if (!previousCompleted) lockReason = 'PREVIOUS'
    else if (!hasAccess && number === 1 && freeState.locked && !active) lockReason = 'FREE_USED'

    const canonical = canonicalQuestionIds(attempts, number)
    const expected = questionCountForQuiz(ids.length, number, QUIZ_QUESTIONS_PER_SITTING)

    return {
      number,
      questionCount: canonical.length > 0 ? canonical.length : expected,
      completed: history.length > 0,
      activeAttemptId: active?.id ?? null,
      latestAttemptId: latest?.id ?? null,
      latestScore: latest?.score ?? null,
      bestScore:
        history.length > 0 ? Math.max(...history.map((attempt) => attempt.score)) : null,
      latestIncorrect: latest?.incorrectCount ?? 0,
      attemptCount: history.length,
      history,
      lockReason,
    }
  })

  const completedQuizzes = slots.filter((slot) => slot.completed).length
  const activeAttemptId = slots.find((slot) => slot.activeAttemptId)?.activeAttemptId ?? null
  const mastered =
    completedQuizzes === quizCount &&
    activeAttemptId === null &&
    wrong === 0

  return {
    key,
    title: pool.title,
    description: pool.description,
    certificationId: pool.certificationId,
    certificationName: pool.certificationName,
    total: ids.length,
    answered,
    wrong,
    mastered,
    locked: !hasAccess && freeState.locked,
    activeAttemptId,
    premiumAccess: hasAccess,
    quizCount,
    completedQuizzes,
    mixedReviewAvailable: hasAccess && completedQuizzes === quizCount && wrong > 0,
    slots,
  }
}

export type NextSitting =
  | { kind: 'resume'; attemptId: string }
  | {
      kind: 'questions'
      questionIds: string[]
      title: string
      certificationId: string
      accessTier: QuizAccessTier
      quizNumber?: number
      sessionKind: QuizSessionKind
    }
  | { kind: 'completed'; attemptId: string }
  | { kind: 'locked'; reason: 'subscription' | 'free_used' }
  | { kind: 'sequence_locked'; previousQuizNumber: number }
  | { kind: 'no_incorrect' }
  | { kind: 'mastered' }
  | { kind: 'empty' }

function usedByOtherSlots(attempts: NormalizedAttempt[], quizNumber: number) {
  const used = new Set<string>()
  const quizNumbers = new Set(
    attempts
      .filter((attempt) => attempt.sessionKind === 'STANDARD' && attempt.quizNumber !== null)
      .map((attempt) => attempt.quizNumber as number)
  )

  for (const number of quizNumbers) {
    if (number === quizNumber) continue
    for (const id of canonicalQuestionIds(attempts, number)) used.add(id)
  }
  return Array.from(used)
}

function fixedQuestionsForSlot(
  attempts: NormalizedAttempt[],
  quizNumber: number,
  poolIds: string[],
  budget: number,
) {
  const existing = canonicalQuestionIds(attempts, quizNumber)
  const orderedPool = existing.length > 0 ? poolIds : shuffled(poolIds)
  return fixedQuizQuestionSet(
    existing,
    orderedPool,
    usedByOtherSlots(attempts, quizNumber),
    budget,
  )
}

export async function prepareQuizSitting(
  userId: string,
  key: QuizKey,
  quizNumber: number | null,
  action: QuizStartAction,
): Promise<NextSitting | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const poolIds = questions.map((question) => question.id)
  const quizCount = quizCountForQuestions(poolIds.length, QUIZ_QUESTIONS_PER_SITTING)
  if (quizCount === 0) return { kind: 'empty' }

  const [hasAccess, allAttempts] = await Promise.all([
    hasAccessToCertification(userId, pool.certificationId),
    loadUserQuizAttempts(userId),
  ])
  const attempts = normalizeAttemptsForKey(allAttempts, key, quizCount)

  if (action === 'mixedReview') {
    if (!hasAccess) return { kind: 'locked', reason: 'subscription' }

    const active = [...attempts]
      .reverse()
      .find(
        (attempt) =>
          attempt.sessionKind === 'MIXED_REVIEW' && attempt.status === 'IN_PROGRESS'
      )
    if (active) return { kind: 'resume', attemptId: active.id }

    const firstIncomplete = Array.from({ length: quizCount }, (_, index) => index + 1)
      .find((number) => latestCompletedStandard(attempts, number) === null)
    if (firstIncomplete) {
      return {
        kind: 'sequence_locked',
        previousQuizNumber: Math.max(1, firstIncomplete - 1),
      }
    }

    const verdicts = latestLearningVerdicts(attempts)
    const wrong = poolIds.filter((id) => verdicts.get(id) === false)
    if (wrong.length === 0) return { kind: 'mastered' }

    return {
      kind: 'questions',
      questionIds: shuffled(wrong).slice(0, QUIZ_QUESTIONS_PER_SITTING),
      title: pool.title + ' · Mixed Review',
      certificationId: pool.certificationId,
      accessTier: 'PAID',
      sessionKind: 'MIXED_REVIEW',
    }
  }

  if (
    quizNumber === null ||
    !Number.isInteger(quizNumber) ||
    quizNumber < 1 ||
    quizNumber > quizCount
  ) {
    return null
  }

  if (!hasAccess && quizNumber > 1) {
    return { kind: 'locked', reason: 'subscription' }
  }

  if (quizNumber > 1 && latestCompletedStandard(attempts, quizNumber - 1) === null) {
    return { kind: 'sequence_locked', previousQuizNumber: quizNumber - 1 }
  }

  const standardActive = activeStandard(attempts, quizNumber)
  if (standardActive) return { kind: 'resume', attemptId: standardActive.id }

  if (action === 'retryIncorrect') {
    if (!hasAccess) return { kind: 'locked', reason: 'subscription' }

    const retryActive = [...attempts]
      .reverse()
      .find(
        (attempt) =>
          attempt.sessionKind === 'INCORRECT_RETRY' &&
          attempt.quizNumber === quizNumber &&
          attempt.status === 'IN_PROGRESS'
      )
    if (retryActive) return { kind: 'resume', attemptId: retryActive.id }

    const latest = latestCompletedStandard(attempts, quizNumber)
    if (!latest) return { kind: 'no_incorrect' }

    const incorrectIds = latest.answers
      .filter((answer) => answer.isCorrect === false)
      .map((answer) => answer.questionId)
    if (incorrectIds.length === 0) return { kind: 'no_incorrect' }

    return {
      kind: 'questions',
      questionIds: incorrectIds,
      title: pool.title + ' · Quiz ' + quizNumber + ' · Retry Incorrect',
      certificationId: pool.certificationId,
      accessTier: 'PAID',
      quizNumber,
      sessionKind: 'INCORRECT_RETRY',
    }
  }

  const completed = latestCompletedStandard(attempts, quizNumber)

  if (action === 'start' && completed) {
    return { kind: 'completed', attemptId: completed.id }
  }

  if (action === 'retake' && !hasAccess) {
    return { kind: 'locked', reason: 'subscription' }
  }

  if (!hasAccess) {
    const freeState = freeSlotState(attempts)
    if (freeState.locked) return { kind: 'locked', reason: 'free_used' }
    if (freeState.activeAttemptId) {
      return { kind: 'resume', attemptId: freeState.activeAttemptId }
    }
  }

  const budget = questionCountForQuiz(
    poolIds.length,
    quizNumber,
    QUIZ_QUESTIONS_PER_SITTING,
  )
  const picked = fixedQuestionsForSlot(attempts, quizNumber, poolIds, budget)
  if (picked.length === 0) return { kind: 'empty' }

  return {
    kind: 'questions',
    questionIds: picked,
    title: pool.title + ' · Quiz ' + quizNumber,
    certificationId: pool.certificationId,
    accessTier: hasAccess ? 'PAID' : 'FREE',
    quizNumber,
    sessionKind: 'STANDARD',
  }
}
