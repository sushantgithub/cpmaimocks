import { prisma } from '@/lib/db'
import { hasAccessToCertification } from '@/lib/subscription'

export const QUIZ_QUESTIONS_PER_SITTING = 10
/** How much of a quiz someone can answer before they are asked to subscribe. */
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
  /** Everything answered, and answered correctly: nothing left to serve. */
  mastered: boolean
  locked: boolean
}

function domainKey(categoryId: string): QuizKey {
  return `domain:${categoryId}`
}

function tagKey(quizId: string): QuizKey {
  return `tag:${quizId}`
}

/**
 * Questions a quiz can draw on. Domain quizzes take a category; tag quizzes
 * take a label that is independent of domain, so an algorithm drill can pull
 * from wherever its questions happen to live.
 */
async function poolFilter(key: QuizKey) {
  const [kind, id] = key.split(':')
  if (kind === 'domain') {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { certification: { select: { id: true, name: true } } },
    })
    if (!category) return null

    // A question claimed by a tag quiz belongs to that quiz alone, so the
    // algorithm questions sitting in this domain are served by the Algorithms
    // drill instead of appearing in both and completing one by way of the other.
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

/**
 * Questions this user has answered for real, ignoring anything from before
 * they restarted the quiz. Rows are created for every question the moment a
 * sitting starts, so an unanswered row must not count as seen — otherwise
 * abandoning a sitting would silently bury the questions it had served.
 */
async function answeredIn(userId: string, key: QuizKey, questionIds: string[]) {
  if (questionIds.length === 0) return []
  const reset = await prisma.quizReset.findUnique({
    where: { userId_quizKey: { userId, quizKey: key } },
    select: { resetAt: true },
  })

  return prisma.examAnswer.findMany({
    where: {
      questionId: { in: questionIds },
      selectedAnswer: { not: null },
      attempt: { userId },
      ...(reset ? { updatedAt: { gt: reset.resetAt } } : {}),
    },
    select: { questionId: true, isCorrect: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  })
}

/** Latest verdict per question, so a later correct answer retires an earlier wrong one. */
export function verdicts(rows: { questionId: string; isCorrect: boolean | null }[]) {
  const latest = new Map<string, boolean>()
  for (const r of rows) latest.set(r.questionId, r.isCorrect === true)
  return latest
}

/**
 * The selection rule: never-answered questions first, then ones answered
 * wrongly oldest-first, and never one already answered correctly. Callers
 * pass `unseen` pre-shuffled; `wrong` keeps its order so the longest-standing
 * mistake comes back soonest.
 */
export function pickForSitting(unseen: string[], wrong: string[], budget: number) {
  if (budget <= 0) return []
  return [...unseen, ...wrong].slice(0, budget)
}

export async function listQuizzes(userId: string): Promise<QuizSummary[]> {
  const [categories, tagQuizzes] = await Promise.all([
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
  ])

  const keys: QuizKey[] = [
    ...categories.map((c) => domainKey(c.id)),
    ...tagQuizzes.map((q) => tagKey(q.id)),
  ]

  const summaries = await Promise.all(keys.map((key) => quizSummary(userId, key)))
  // A domain with nothing published yet is not a quiz anyone can take.
  return summaries.filter((s): s is QuizSummary => s !== null && s.total > 0)
}

export async function quizSummary(userId: string, key: QuizKey): Promise<QuizSummary | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const ids = questions.map((q) => q.id)
  const rows = await answeredIn(userId, key, ids)
  const latest = verdicts(rows)

  const answered = latest.size
  const wrong = Array.from(latest.values()).filter((ok) => !ok).length
  const hasAccess = await hasAccessToCertification(userId, pool.certificationId)

  return {
    key,
    title: pool.title,
    description: pool.description,
    certificationId: pool.certificationId,
    certificationName: pool.certificationName,
    total: ids.length,
    answered,
    wrong,
    mastered: ids.length > 0 && answered >= ids.length && wrong === 0,
    locked: !hasAccess && answered >= QUIZ_FREE_QUESTION_LIMIT,
  }
}

export type NextSitting =
  | { kind: 'questions'; questionIds: string[]; title: string; certificationId: string }
  | { kind: 'mastered' }
  | { kind: 'locked'; answered: number }
  | { kind: 'empty' }

/**
 * Picks the next 10: questions never answered first, then ones answered
 * wrongly, oldest first. Questions already answered correctly are left alone
 * until the whole quiz is mastered and deliberately restarted.
 */
export async function nextSitting(userId: string, key: QuizKey): Promise<NextSitting | null> {
  const pool = await poolFilter(key)
  if (!pool) return null

  const questions = await prisma.question.findMany({ where: pool.where, select: { id: true } })
  const ids = questions.map((q) => q.id)
  if (ids.length === 0) return { kind: 'empty' }

  const rows = await answeredIn(userId, key, ids)
  const latest = verdicts(rows)

  const hasAccess = await hasAccessToCertification(userId, pool.certificationId)
  if (!hasAccess && latest.size >= QUIZ_FREE_QUESTION_LIMIT) {
    return { kind: 'locked', answered: latest.size }
  }

  const unseen = ids.filter((id) => !latest.has(id))
  const wrongOldestFirst = rows
    .filter((r) => latest.get(r.questionId) === false)
    .map((r) => r.questionId)
  const wrong = Array.from(new Set(wrongOldestFirst))

  if (unseen.length === 0 && wrong.length === 0) return { kind: 'mastered' }

  // The locked check above guarantees a free user has allowance left here.
  const budget = hasAccess
    ? QUIZ_QUESTIONS_PER_SITTING
    : Math.min(QUIZ_QUESTIONS_PER_SITTING, QUIZ_FREE_QUESTION_LIMIT - latest.size)

  const shuffled = unseen.sort(() => Math.random() - 0.5)
  const picked = pickForSitting(shuffled, wrong, budget)

  return { kind: 'questions', questionIds: picked, title: pool.title, certificationId: pool.certificationId }
}

export async function restartQuiz(userId: string, key: QuizKey) {
  const pool = await poolFilter(key)
  if (!pool) return false
  await prisma.quizReset.upsert({
    where: { userId_quizKey: { userId, quizKey: key } },
    create: { userId, quizKey: key },
    update: { resetAt: new Date() },
  })
  return true
}
