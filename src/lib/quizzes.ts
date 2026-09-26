import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds, hasAccessToCertification } from '@/lib/subscription'
import {
  fixedQuizQuestionSet,
  freeQuizAttemptState,
  questionCountForQuiz,
  quizCountForQuestions,
  readQuizAttemptConfig,
  previousQuizAllowsNext,
  isFullyAnsweredQuizAttempt,
  latestQuizVerdicts,
  countsAsFullQuizAttempt,
  isEffectivelyCompleteRetry,
  quizMasteryProgress,
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
  activeRetryAttemptId: string | null
  latestAttemptId: string | null
  latestScore: number | null
  bestScore: number | null
  latestIncorrect: number
  answeredCount: number
  masteredCount: number
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
  unansweredCount: number | null
  totalQuestions: number
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

    return {
      title: category.name,
      description: null as string | null,
      certificationId: category.certificationId,
      certificationName: category.certification.name,
      where: {
        status: 'PUBLISHED' as const,
        contentType: 'QUIZ' as const,
        categoryId: category.id,
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
        contentType: 'QUIZ' as const,
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
      unansweredCount: true,
      totalQuestions: true,
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
    (attempt) => countsAsFullQuizAttempt(attempt.sessionKind) && attempt.quizNumber === quizNumber
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

function latestStandard(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...standardForSlot(attempts, quizNumber)].reverse()[0] ?? null
}

function latestCompletedStandard(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...standardForSlot(attempts, quizNumber)]
    .reverse()
    .find((attempt) => attempt.status === 'COMPLETED') ?? null
}

function learningForSlot(attempts: NormalizedAttempt[], quizNumber: number) {
  return attempts.filter(
    (attempt) =>
      attempt.quizNumber === quizNumber &&
      (attempt.sessionKind === 'STANDARD' || attempt.sessionKind === 'INCORRECT_RETRY')
  )
}

function completedQuizMilestone(
  attempts: NormalizedAttempt[],
  quizNumber: number,
  expectedQuestionCount: number,
) {
  const canonical = canonicalQuestionIds(attempts, quizNumber)
  if (canonical.length !== expectedQuestionCount) return null

  const progress = quizMasteryProgress(canonical, learningForSlot(attempts, quizNumber))
  if (!progress.masteredEver) return null

  return latestCompletedStandard(attempts, quizNumber)
}

function activeStandard(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...standardForSlot(attempts, quizNumber)]
    .reverse()
    .find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
}

function activeIncorrectRetry(attempts: NormalizedAttempt[], quizNumber: number) {
  return [...attempts]
    .reverse()
    .find(
      (attempt) =>
        attempt.sessionKind === 'INCORRECT_RETRY' &&
        attempt.quizNumber === quizNumber &&
        attempt.status === 'IN_PROGRESS' &&
        !isEffectivelyCompleteRetry(attempt)
    ) ?? null
}

function currentLearningVerdicts(attempts: NormalizedAttempt[]) {
  return latestQuizVerdicts(
    attempts.filter(
      (attempt) =>
        attempt.sessionKind === 'STANDARD' ||
        attempt.sessionKind === 'INCORRECT_RETRY'
    )
  )
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

function freeSlotState(attempts: NormalizedAttempt[], firstQuizNumber = 1) {
  return freeQuizAttemptState(
    standardForSlot(attempts, firstQuizNumber).map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
    }))
  )
}

export async function listQuizzes(userId: string): Promise<QuizSummary[]> {
  const [categories, attempts, accessible] = await Promise.all([
    prisma.category.findMany({
      where: {
        certification: { isActive: true, usesDomains: true },
        quizzes: { some: { isActive: true } },
      },
      include: { certification: { select: { id: true, name: true, sortOrder: true } } },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    }),
    loadUserQuizAttempts(userId),
    getAccessibleCertificationIds(userId),
  ])

  // Learner UI is domain-first: Certification -> Domain -> Quiz.
  // Persisted Quiz rows define ownership/admin lifecycle, while the domain
  // summary keeps the proven learner experience of one expandable domain card.
  const keys: QuizKey[] = categories.map((category) => domainKey(category.id))

  const summaries = await Promise.all(
    keys.map((key) => quizSummary(userId, key, attempts, accessible))
  )
  return summaries.filter((summary): summary is QuizSummary => summary !== null && summary.total > 0)
}

async function persistedDomainSlots(key: QuizKey) {
  const [kind, categoryId] = key.split(':')
  if (kind !== 'domain') return null

  const quizzes = await prisma.quiz.findMany({
    where: { categoryId, isActive: true },
    select: { id: true, tag: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return Promise.all(quizzes.map(async (quiz) => ({
    number: quiz.sortOrder + 1,
    ids: (await prisma.question.findMany({
      where: {
        status: 'PUBLISHED',
        contentType: 'QUIZ',
        categoryId,
        tags: { has: quiz.tag },
      },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })).map((question) => question.id),
  })))
}

export async function quizSummary(
  userId: string,
  key: QuizKey,
  preloadedAttempts?: QuizAttemptRow[],
  accessible?: string[] | 'ALL',
): Promise<QuizSummary | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const persistedSlots = await persistedDomainSlots(key)
  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const ids = questions.map((question) => question.id)
  const slotDefs = persistedSlots && persistedSlots.length > 0
    ? persistedSlots.filter((slot) => slot.ids.length > 0)
    : Array.from({ length: quizCountForQuestions(ids.length, QUIZ_QUESTIONS_PER_SITTING) }, (_, index) => ({
        number: index + 1,
        ids: ids.slice(index * QUIZ_QUESTIONS_PER_SITTING, (index + 1) * QUIZ_QUESTIONS_PER_SITTING),
      }))
  const quizCount = slotDefs.length
  if (quizCount === 0) return null

  const allAttempts = preloadedAttempts ?? await loadUserQuizAttempts(userId)
  const attempts = normalizeAttemptsForKey(allAttempts, key, Math.max(...slotDefs.map((slot) => slot.number)))

  const hasAccess =
    accessible !== undefined
      ? accessible === 'ALL' || accessible.includes(pool.certificationId)
      : await hasAccessToCertification(userId, pool.certificationId)

  const firstQuizNumber = slotDefs[0].number
  const freeState = freeSlotState(attempts, firstQuizNumber)
  const progressVerdicts = new Map<string, boolean>()

  const slots: QuizSlotSummary[] = slotDefs.map((slotDef, index) => {
    const number = slotDef.number
    const slotAttempts = standardForSlot(attempts, number)
    const active = [...slotAttempts].reverse().find((attempt) => attempt.status === 'IN_PROGRESS') ?? null
    const history = historyForSlot(attempts, number)
    const latest = history[0] ?? null
    const expected = slotDef.ids.length
    const previousSlot = index > 0 ? slotDefs[index - 1] : null
    const previousCompleted =
      !previousSlot ||
      completedQuizMilestone(attempts, previousSlot.number, previousSlot.ids.length) !== null
    const previousReady =
      !previousSlot || previousQuizAllowsNext(previousCompleted)
    const activeRetry = activeIncorrectRetry(attempts, number)

    let lockReason: QuizLockReason = null
    if (!hasAccess && index > 0) lockReason = 'SUBSCRIPTION'
    else if (!previousReady) lockReason = 'PREVIOUS'
    else if (!hasAccess && index === 0 && freeState.locked && !active) lockReason = 'FREE_USED'

    const canonical = canonicalQuestionIds(attempts, number)
    const progress = quizMasteryProgress(canonical, learningForSlot(attempts, number))
    const completed =
      canonical.length === expected && progress.masteredEver

    for (const [questionId, correct] of Array.from(progress.verdicts.entries())) {
      if (canonical.includes(questionId)) progressVerdicts.set(questionId, correct)
    }

    const currentIncorrect = completed
      ? 0
      : canonical.filter((questionId) => progress.verdicts.get(questionId) === false).length
    const answeredCount = canonical.filter((questionId) => progress.verdicts.has(questionId)).length
    const masteredCount = canonical.filter(
      (questionId) => progress.verdicts.get(questionId) === true,
    ).length

    return {
      number,
      questionCount: canonical.length > 0 ? canonical.length : expected,
      completed,
      activeAttemptId: active?.id ?? null,
      activeRetryAttemptId: activeRetry?.id ?? null,
      latestAttemptId: latest?.id ?? null,
      latestScore: latest?.score ?? null,
      bestScore:
        history.length > 0 ? Math.max(...history.map((attempt) => attempt.score)) : null,
      latestIncorrect: currentIncorrect,
      answeredCount,
      masteredCount,
      attemptCount: history.length,
      history,
      lockReason,
    }
  })

  const answered = Array.from(progressVerdicts.keys()).filter((id) => ids.includes(id)).length
  const wrong = Array.from(progressVerdicts.entries()).filter(
    ([id, correct]) => ids.includes(id) && !correct
  ).length
  const completedQuizzes = slots.filter((slot) => slot.completed).length
  const activeAttemptId = slots.find((slot) => slot.activeAttemptId)?.activeAttemptId ?? null
  const mastered = completedQuizzes === quizCount

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
    mixedReviewAvailable:
      hasAccess &&
      completedQuizzes === quizCount &&
      !slots.some((slot) => slot.activeAttemptId) &&
      wrong > 0,
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

  for (const number of Array.from(quizNumbers)) {
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
  if (existing.length > 0) {
    return fixedQuizQuestionSet(
      existing,
      poolIds,
      usedByOtherSlots(attempts, quizNumber),
      budget,
    )
  }

  // New quiz slots are deterministic for everyone: the first ten imported
  // questions are Quiz 1, the next ten Quiz 2, and so on. Existing learners
  // keep the canonical set recorded on their first attempt.
  const start = (quizNumber - 1) * QUIZ_QUESTIONS_PER_SITTING
  return poolIds.slice(start, start + budget)
}

export async function prepareQuizSitting(
  userId: string,
  key: QuizKey,
  quizNumber: number | null,
  action: QuizStartAction,
): Promise<NextSitting | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({
    where: pool.where,
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  const poolIds = questions.map((question) => question.id)
  const persistedSlots = await persistedDomainSlots(key)
  const slotDefs = persistedSlots && persistedSlots.length > 0
    ? persistedSlots.filter((slot) => slot.ids.length > 0)
    : Array.from({ length: quizCountForQuestions(poolIds.length, QUIZ_QUESTIONS_PER_SITTING) }, (_, index) => ({
        number: index + 1,
        ids: poolIds.slice(index * QUIZ_QUESTIONS_PER_SITTING, (index + 1) * QUIZ_QUESTIONS_PER_SITTING),
      }))
  if (slotDefs.length === 0) return { kind: 'empty' }

  const [hasAccess, allAttempts] = await Promise.all([
    hasAccessToCertification(userId, pool.certificationId),
    loadUserQuizAttempts(userId),
  ])
  const attempts = normalizeAttemptsForKey(allAttempts, key, Math.max(...slotDefs.map((slot) => slot.number)))
  const firstQuizNumber = slotDefs[0].number

  if (action === 'mixedReview') {
    if (!hasAccess) return { kind: 'locked', reason: 'subscription' }
    const active = [...attempts].reverse().find(
      (attempt) => attempt.sessionKind === 'MIXED_REVIEW' && attempt.status === 'IN_PROGRESS'
    )
    if (active) return { kind: 'resume', attemptId: active.id }

    const firstIncompleteIndex = slotDefs.findIndex(
      (slot) => completedQuizMilestone(attempts, slot.number, slot.ids.length) === null
    )
    if (firstIncompleteIndex >= 0) {
      const previous = slotDefs[Math.max(0, firstIncompleteIndex - 1)]
      return { kind: 'sequence_locked', previousQuizNumber: previous.number }
    }

    const verdicts = currentLearningVerdicts(attempts)
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

  if (quizNumber === null || !Number.isInteger(quizNumber)) return null
  const slotIndex = slotDefs.findIndex((slot) => slot.number === quizNumber)
  if (slotIndex < 0) return null
  const slot = slotDefs[slotIndex]
  const previousSlot = slotIndex > 0 ? slotDefs[slotIndex - 1] : null

  if (!hasAccess && slotIndex > 0) return { kind: 'locked', reason: 'subscription' }

  if (
    previousSlot &&
    !previousQuizAllowsNext(
      completedQuizMilestone(attempts, previousSlot.number, previousSlot.ids.length) !== null
    )
  ) {
    return { kind: 'sequence_locked', previousQuizNumber: previousSlot.number }
  }

  const standardActive = activeStandard(attempts, quizNumber)
  if (standardActive) return { kind: 'resume', attemptId: standardActive.id }

  if (action === 'retryIncorrect') {
    if (!hasAccess) return { kind: 'locked', reason: 'subscription' }
    const canonical = canonicalQuestionIds(attempts, quizNumber)
    if (completedQuizMilestone(attempts, quizNumber, slot.ids.length)) {
      return { kind: 'mastered' }
    }
    const retryActive = activeIncorrectRetry(attempts, quizNumber)
    if (retryActive) return { kind: 'resume', attemptId: retryActive.id }
    const progress = quizMasteryProgress(canonical, learningForSlot(attempts, quizNumber))
    const incorrectIds = canonical.filter((questionId) => progress.verdicts.get(questionId) === false)
    if (incorrectIds.length === 0) return { kind: 'no_incorrect' }
    return {
      kind: 'questions',
      questionIds: incorrectIds,
      title: pool.title + ' · Quiz ' + quizNumber + ' · Focused Practice',
      certificationId: pool.certificationId,
      accessTier: 'PAID',
      quizNumber,
      sessionKind: 'INCORRECT_RETRY',
    }
  }

  const completed = completedQuizMilestone(attempts, quizNumber, slot.ids.length)
  if (action === 'start' && completed) return { kind: 'completed', attemptId: completed.id }
  if (action === 'retake' && !hasAccess) return { kind: 'locked', reason: 'subscription' }

  if (!hasAccess) {
    const freeState = freeSlotState(attempts, firstQuizNumber)
    if (freeState.locked) return { kind: 'locked', reason: 'free_used' }
    if (freeState.activeAttemptId) return { kind: 'resume', attemptId: freeState.activeAttemptId }
  }

  const existing = canonicalQuestionIds(attempts, quizNumber)
  const picked = existing.length > 0
    ? fixedQuizQuestionSet(existing, slot.ids, usedByOtherSlots(attempts, quizNumber), slot.ids.length)
    : slot.ids
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
