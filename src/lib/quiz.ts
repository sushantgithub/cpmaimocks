import { prisma } from '@/lib/db'
import type { PracticeConfig } from '@/types'
import { isAnswerCorrect, normalizeAnswer } from '@/lib/answers'
import { answerForFinalScoring, latestCheckedVerdicts, questionHistoryState } from '@/lib/exam-progress'

export class ExamSubmissionError extends Error {
  constructor(public code: 'ALREADY_SUBMITTED' | 'TIME_EXPIRED', message: string) {
    super(message)
    this.name = 'ExamSubmissionError'
  }
}

export async function getExamQuestions(examId: string, userId?: string) {
  const exam = await prisma.mockExam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        // A draft or archived question is not ready to be seen, so linking it
        // to an exam must not put it in front of a taker the way practice
        // already refuses to.
        where: { question: { status: 'PUBLISHED' } },
        include: {
          question: {
            select: {
              id: true,
              questionId: true,
              text: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              optionE: true,
              optionF: true,
              // The count alone, never which ones: enough to render checkboxes
              // and say "select two" without giving the answer away.
              correctAnswer: true,
              difficulty: true,
              category: { select: { name: true } },
              topic: { select: { name: true } },
              // explanation NOT returned before submission
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!exam) return null

  let questions = exam.questions.map((eq) => eq.question)

  // For sampled/domain mocks, subsequent attempts should teach rather than
  // randomly repeat questions the learner already answered correctly. Prefer
  // questions previously answered incorrectly, then unseen questions. Only
  // fall back to previously-correct questions when those two groups cannot
  // fill the sitting.
  if (userId && exam.questionsPerAttempt && exam.questionsPerAttempt < questions.length) {
    const history = await prisma.examAnswer.findMany({
      where: {
        attempt: { userId, examId, status: 'COMPLETED' },
        questionId: { in: questions.map((q) => q.id) },
      },
      select: { questionId: true, isCorrect: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    const latest = new Map<string, boolean | null>()
    for (const answer of history) {
      if (!latest.has(answer.questionId)) latest.set(answer.questionId, answer.isCorrect)
    }

    const missed = questions.filter((q) => questionHistoryState(latest, q.id) === 'missed')
    const unseen = questions.filter((q) => questionHistoryState(latest, q.id) === 'unseen')
    const correct = questions.filter((q) => questionHistoryState(latest, q.id) === 'correct')
    const order = (items: typeof questions) => exam.randomizeQuestions ? shuffle(items) : items

    questions = [...order(missed), ...order(unseen), ...order(correct)]
    return { exam, questions: questions.slice(0, exam.questionsPerAttempt) }
  }

  return { exam, questions: selectForAttempt(questions, exam.randomizeQuestions, exam.questionsPerAttempt) }
}

/**
 * Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a shuffle: the
 * comparator is inconsistent, so the result stays biased towards the original
 * order. That bias did not matter while every attempt received the whole pool;
 * it does once a sample decides which questions a learner sees at all.
 */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * What one attempt is served. A domain mock links a pool of sixty and serves
 * ten of it; a full-length mock leaves `perAttempt` null and serves everything.
 *
 * Sampling runs after the caller has filtered to published questions, so a
 * withdrawn question cannot take up a slot. With randomisation off the sample
 * is the first N in the exam's own order, which keeps a fixed-order exam
 * reproducible.
 *
 * Attempts are independent: each draws from the whole pool, so a question can
 * recur across attempts. That matches how this exam already behaved when it
 * served the full pool every time.
 */
export function selectForAttempt<T>(
  pool: T[],
  randomize: boolean,
  perAttempt: number | null,
): T[] {
  const ordered = randomize ? shuffle(pool) : [...pool]
  if (perAttempt === null || perAttempt <= 0 || perAttempt >= ordered.length) return ordered
  return ordered.slice(0, perAttempt)
}

export async function getPracticeQuestions(userId: string, config: PracticeConfig) {
  const where: Record<string, unknown> = { status: 'PUBLISHED' }

  if (config.certificationId) {
    where.certificationId = config.certificationId
  }
  if (config.difficulty && config.difficulty.length > 0) {
    where.difficulty = { in: config.difficulty }
  }
  if (config.categoryIds && config.categoryIds.length > 0) {
    where.categoryId = { in: config.categoryIds }
  }
  if (config.topicIds && config.topicIds.length > 0) {
    where.topicId = { in: config.topicIds }
  }

  if (config.mode === 'INCORRECT') {
    const incorrectIds = await prisma.examAnswer.findMany({
      where: { attempt: { userId }, isCorrect: false },
      select: { questionId: true },
      distinct: ['questionId'],
    })
    where.id = { in: incorrectIds.map((a) => a.questionId) }
  }

  if (config.mode === 'BOOKMARKED') {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { questionId: true },
    })
    where.id = { in: bookmarks.map((b) => b.questionId) }
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      questionId: true,
      text: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionE: true,
      optionF: true,
      correctAnswer: true,
      difficulty: true,
      category: { select: { name: true } },
      topic: { select: { name: true } },
    },
    take: config.questionCount * 3, // fetch more for randomization
  })

  const shuffled = questions.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, config.questionCount)
}

export async function submitExam(
  attemptId: string,
  answers: Record<string, string>
) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { timeLimitMinutes: true, showExplanations: true } },
      answers: { include: { question: { select: { id: true, correctAnswer: true, categoryId: true, topicId: true } } } },
    },
  })

  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'IN_PROGRESS') {
    throw new ExamSubmissionError('ALREADY_SUBMITTED', 'Exam already submitted')
  }

  const timeTaken = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
  const timeLimitSeconds = (attempt.exam?.timeLimitMinutes ?? 0) * 60
  // The server clock is authoritative. A late submission is still finalized
  // with the answers the browser has so background-tab timer throttling cannot
  // strand an attempt or destroy the learner's work.
  const recordedTimeTaken = timeLimitSeconds > 0
    ? Math.min(timeTaken, timeLimitSeconds)
    : timeTaken
  const expired = timeLimitSeconds > 0 && timeTaken >= timeLimitSeconds

  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  const scoredAnswers = attempt.answers.map((ea) => {
    const selected = answerForFinalScoring({
      showExplanations: attempt.exam?.showExplanations ?? false,
      storedAnswer: ea.selectedAnswer,
      storedIsCorrect: ea.isCorrect,
      browserAnswer: answers[ea.questionId],
      expired,
    })
    const isCorrect = selected ? isAnswerCorrect(selected, ea.question.correctAnswer) : null

    if (isCorrect === true) correctCount++
    else if (isCorrect === false) incorrectCount++
    else unansweredCount++

    return { id: ea.id, selectedAnswer: selected, isCorrect }
  })

  const score = attempt.totalQuestions > 0
    ? (correctCount / attempt.totalQuestions) * 100
    : 0

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.examAttempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        submittedAt: new Date(),
        timeTakenSeconds: recordedTimeTaken,
        score,
        correctCount,
        incorrectCount,
        unansweredCount,
      },
    })

    if (claimed.count !== 1) {
      throw new ExamSubmissionError('ALREADY_SUBMITTED', 'Exam already submitted')
    }

    await Promise.all(
      scoredAnswers.map((answer) =>
        tx.examAnswer.update({
          where: { id: answer.id },
          data: {
            selectedAnswer: answer.selectedAnswer,
            isCorrect: answer.isCorrect,
          },
        })
      )
    )
  }, { timeout: 15000, maxWait: 5000 })

  try {
    await prisma.analyticsEvent.create({
      data: {
        event: 'EXAM_COMPLETED',
        userId: attempt.userId,
        metadata: { attemptId, score, expired },
      },
    })
  } catch (err) {
    console.error('[SubmitExam] analytics failed', err)
  }

  return {
    score,
    correctCount,
    incorrectCount,
    unansweredCount,
    timeTaken: recordedTimeTaken,
    expired,
  }
}

export async function getAttemptResults(attemptId: string, userId: string) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, userId, status: 'COMPLETED' },
    include: {
      exam: { select: { title: true, passingScore: true, timeLimitMinutes: true } },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              optionE: true,
              optionF: true,
              correctAnswer: true,
              explanation: true,
              explanationA: true,
              explanationB: true,
              explanationC: true,
              explanationD: true,
              explanationE: true,
              explanationF: true,
              difficulty: true,
              category: { select: { name: true } },
              topic: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!attempt) return null

  const passingScore = attempt.exam?.passingScore ?? 70
  const passed = (attempt.score ?? 0) >= passingScore

  return { ...attempt, passed, passingScore }
}

export async function getUserStats(userId: string) {
  const [attempts, checkedAnswers] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { score: true, correctCount: true, totalQuestions: true, examId: true },
    }),
    prisma.examAnswer.findMany({
      where: {
        attempt: { userId },
        isCorrect: { not: null },
      },
      select: { questionId: true, isCorrect: true },
      orderBy: { updatedAt: 'asc' },
    }),
  ])

  const totalExams = attempts.length
  // Progress is based on checked/scored answers, not merely selected drafts.
  // The latest verdict wins, matching the quiz progress model.
  const latest = latestCheckedVerdicts(checkedAnswers)
  const totalQuestions = latest.size
  const masteredQuestions = Array.from(latest.values()).filter(Boolean).length
  const avgScore = totalExams > 0
    ? attempts.reduce((s, a) => s + (a.score ?? 0), 0) / totalExams
    : 0
  const bestScore = totalExams > 0
    ? Math.max(...attempts.map((a) => a.score ?? 0))
    : 0

  return {
    totalExams,
    totalQuestions,
    masteredQuestions,
    avgScore: Math.round(avgScore * 10) / 10,
    bestScore: Math.round(bestScore * 10) / 10,
  }
}
