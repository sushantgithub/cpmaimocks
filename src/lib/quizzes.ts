import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds, hasAccessToCertification } from '@/lib/subscription'
import { freeQuizAttemptState, readQuizAttemptConfig } from '@/lib/quiz-entitlement'

export const QUIZ_QUESTIONS_PER_SITTING = 10
export const QUIZ_FREE_QUESTION_LIMIT = 10

export type QuizKey = `domain:${string}` | `tag:${string}`

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
}

interface QuizAttemptRow {
  id: string
  status: string
  createdAt: Date
  practiceConfig: unknown
}

function domainKey(categoryId: string): QuizKey {
  return `domain:${categoryId}`
}

function tagKey(quizId: string): QuizKey {
  return `tag:${quizId}`
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
    select: { id: true, status: true, createdAt: true, practiceConfig: true },
    orderBy: { createdAt: 'asc' },
  })
}

function attemptsForKey(attempts: QuizAttemptRow[], key: QuizKey) {
  return attempts.filter((attempt) => readQuizAttemptConfig(attempt.practiceConfig)?.quizKey === key)
}

async function quizHistory(
  userId: string,
  key: QuizKey,
  questionIds: string[],
  attempts: QuizAttemptRow[],
  respectReset: boolean,
) {
  let cycleAttempts = attemptsForKey(attempts, key)

  if (respectReset) {
    const reset = await prisma.quizReset.findUnique({
      where: { userId_quizKey: { userId, quizKey: key } },
      select: { resetAt: true },
    })
    if (reset) {
      cycleAttempts = cycleAttempts.filter((attempt) => attempt.createdAt >= reset.resetAt)
    }
  }

  const attemptIds = cycleAttempts.map((attempt) => attempt.id)
  if (attemptIds.length === 0 || questionIds.length === 0) {
    return { attempts: cycleAttempts, rows: [] as { questionId: string; isCorrect: boolean | null; updatedAt: Date }[] }
  }

  const rows = await prisma.examAnswer.findMany({
    where: {
      attemptId: { in: attemptIds },
      questionId: { in: questionIds },
      isCorrect: { not: null },
    },
    select: { questionId: true, isCorrect: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  })

  return { attempts: cycleAttempts, rows }
}

export function verdicts(rows: { questionId: string; isCorrect: boolean | null }[]) {
  const latest = new Map<string, boolean>()
  for (const row of rows) latest.set(row.questionId, row.isCorrect === true)
  return latest
}

export function pickForSitting(unseen: string[], wrong: string[], budget: number) {
  if (budget <= 0) return []
  return [...unseen, ...wrong].slice(0, budget)
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
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
  const allAttempts = preloadedAttempts ?? await loadUserQuizAttempts(userId)
  const keyAttempts = attemptsForKey(allAttempts, key)

  const hasAccess = accessible !== undefined
    ? accessible === 'ALL' || accessible.includes(pool.certificationId)
    : await hasAccessToCertification(userId, pool.certificationId)

  // Free entitlement is lifetime-per-quiz and deliberately ignores QuizReset.
  // Paid users may reset a mastered quiz, so their progress respects resetAt.
  const history = await quizHistory(userId, key, ids, allAttempts, hasAccess)
  const latest = verdicts(history.rows)
  const answered = latest.size
  const wrong = Array.from(latest.values()).filter((ok) => !ok).length

  const freeState = freeQuizAttemptState(keyAttempts)
  const paidActive = hasAccess
    ? [...history.attempts].reverse().find((attempt) => attempt.status === 'IN_PROGRESS')?.id ?? null
    : null
  const activeAttemptId = hasAccess ? paidActive : freeState.activeAttemptId
  const locked = !hasAccess && freeState.locked

  return {
    key,
    title: pool.title,
    description: pool.description,
    certificationId: pool.certificationId,
    certificationName: pool.certificationName,
    total: ids.length,
    answered,
    wrong,
    mastered: !activeAttemptId && ids.length > 0 && answered >= ids.length && wrong === 0,
    locked,
    activeAttemptId,
  }
}

export type NextSitting =
  | { kind: 'resume'; attemptId: string }
  | { kind: 'questions'; questionIds: string[]; title: string; certificationId: string; premiumAccess: boolean }
  | { kind: 'mastered' }
  | { kind: 'locked'; answered: number }
  | { kind: 'empty' }

export async function nextSitting(userId: string, key: QuizKey): Promise<NextSitting | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const ids = questions.map((question) => question.id)
  if (ids.length === 0) return { kind: 'empty' }

  const [hasAccess, allAttempts] = await Promise.all([
    hasAccessToCertification(userId, pool.certificationId),
    loadUserQuizAttempts(userId),
  ])
  const keyAttempts = attemptsForKey(allAttempts, key)

  if (!hasAccess) {
    const state = freeQuizAttemptState(keyAttempts)
    if (state.locked) {
      const history = await quizHistory(userId, key, ids, allAttempts, false)
      return { kind: 'locked', answered: verdicts(history.rows).size }
    }
    if (state.activeAttemptId) return { kind: 'resume', attemptId: state.activeAttemptId }
  }

  const history = await quizHistory(userId, key, ids, allAttempts, hasAccess)

  if (hasAccess) {
    const active = [...history.attempts].reverse().find((attempt) => attempt.status === 'IN_PROGRESS')
    if (active) return { kind: 'resume', attemptId: active.id }
  }

  const latest = verdicts(history.rows)
  const unseen = ids.filter((id) => !latest.has(id))
  const wrongOldestFirst = history.rows
    .filter((row) => latest.get(row.questionId) === false)
    .map((row) => row.questionId)
  const wrong = Array.from(new Set(wrongOldestFirst))

  if (unseen.length === 0 && wrong.length === 0) return { kind: 'mastered' }

  const budget = hasAccess ? QUIZ_QUESTIONS_PER_SITTING : QUIZ_FREE_QUESTION_LIMIT
  const picked = pickForSitting(shuffled(unseen), wrong, budget)

  return {
    kind: 'questions',
    questionIds: picked,
    title: pool.title,
    certificationId: pool.certificationId,
    premiumAccess: hasAccess,
  }
}

export type RestartQuizOutcome = 'ok' | 'not_found' | 'subscription_required'

export async function restartQuiz(userId: string, key: QuizKey): Promise<RestartQuizOutcome> {
  const pool = await poolFilter(key)
  if (!pool) return 'not_found'

  const hasAccess = await hasAccessToCertification(userId, pool.certificationId)
  if (!hasAccess) return 'subscription_required'

  const attempts = attemptsForKey(await loadUserQuizAttempts(userId), key)
  const activeIds = attempts
    .filter((attempt) => attempt.status === 'IN_PROGRESS')
    .map((attempt) => attempt.id)

  await prisma.$transaction(async (tx) => {
    if (activeIds.length > 0) {
      await tx.examAttempt.updateMany({
        where: { id: { in: activeIds }, userId, status: 'IN_PROGRESS' },
        data: { status: 'ABANDONED' },
      })
    }

    await tx.quizReset.upsert({
      where: { userId_quizKey: { userId, quizKey: key } },
      create: { userId, quizKey: key },
      update: { resetAt: new Date() },
    })
  })

  return 'ok'
}
