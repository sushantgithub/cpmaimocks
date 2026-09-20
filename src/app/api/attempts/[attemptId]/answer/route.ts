import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { answerLetters, expectedCount, isAnswerCorrect, normalizeAnswer } from '@/lib/answers'
import { readQuizAttemptConfig } from '@/lib/quiz-entitlement'

export async function POST(req: Request, { params }: { params: { attemptId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const questionId = typeof body.questionId === 'string' ? body.questionId : ''
  const selectedAnswer = normalizeAnswer(
    typeof body.selectedAnswer === 'string' ? body.selectedAnswer : ''
  )
  if (!questionId || !selectedAnswer) {
    return NextResponse.json({ error: 'Answer required' }, { status: 400 })
  }

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: params.attemptId,
      userId: session.user.id,
      status: 'IN_PROGRESS',
      mode: { in: ['PRACTICE', 'QUIZ'] },
    },
    select: {
      id: true,
      mode: true,
      practiceConfig: true,
      totalQuestions: true,
      startedAt: true,
    },
  })
  if (!attempt) return NextResponse.json({ error: 'Attempt is not active' }, { status: 409 })
  const activeAttempt = attempt

  const row = await prisma.examAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: params.attemptId, questionId } },
    include: {
      question: {
        select: {
          correctAnswer: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          optionE: true,
          optionF: true,
        },
      },
    },
  })
  if (!row) return NextResponse.json({ error: 'Question is not in this attempt' }, { status: 404 })

  const letters = answerLetters(selectedAnswer)
  const available = new Set(
    [
      ['A', row.question.optionA],
      ['B', row.question.optionB],
      ['C', row.question.optionC],
      ['D', row.question.optionD],
      ['E', row.question.optionE],
      ['F', row.question.optionF],
    ].filter(([, text]) => typeof text === 'string' && text.trim().length > 0).map(([key]) => key)
  )
  if (
    letters.length !== expectedCount(row.question.correctAnswer) ||
    letters.some((letter) => !available.has(letter))
  ) {
    return NextResponse.json({ error: 'Invalid answer selection' }, { status: 400 })
  }

  async function finalizeFocusedPracticeIfComplete() {
    if (activeAttempt.mode !== 'QUIZ') return false
    const config = readQuizAttemptConfig(activeAttempt.practiceConfig)
    if (config?.sessionKind !== 'INCORRECT_RETRY') return false

    const rows = await prisma.examAnswer.findMany({
      where: { attemptId: activeAttempt.id },
      select: { isCorrect: true },
    })
    if (
      rows.length < activeAttempt.totalQuestions ||
      rows.some((answer) => answer.isCorrect === null)
    ) {
      return false
    }

    const correctCount = rows.filter((answer) => answer.isCorrect === true).length
    const incorrectCount = rows.filter((answer) => answer.isCorrect === false).length
    const score = activeAttempt.totalQuestions > 0
      ? (correctCount / activeAttempt.totalQuestions) * 100
      : 0
    const timeTakenSeconds = Math.max(
      0,
      Math.floor((Date.now() - activeAttempt.startedAt.getTime()) / 1000),
    )

    const completed = await prisma.examAttempt.updateMany({
      where: { id: activeAttempt.id, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        submittedAt: new Date(),
        timeTakenSeconds,
        score,
        correctCount,
        incorrectCount,
        unansweredCount: 0,
      },
    })

    return completed.count === 1
  }

  // A checked answer is immutable. This makes retries idempotent and prevents
  // changing an answer after its explanation has been revealed.
  if (row.isCorrect !== null && row.selectedAnswer) {
    const attemptCompleted = await finalizeFocusedPracticeIfComplete()
    return NextResponse.json({
      selectedAnswer: row.selectedAnswer,
      isCorrect: row.isCorrect,
      alreadySaved: true,
      attemptCompleted,
    })
  }

  const correct = isAnswerCorrect(selectedAnswer, row.question.correctAnswer)
  const saved = await prisma.examAnswer.updateMany({
    where: { id: row.id, isCorrect: null, attempt: { status: 'IN_PROGRESS' } },
    data: { selectedAnswer, isCorrect: correct },
  })

  if (saved.count !== 1) {
    const existing = await prisma.examAnswer.findUnique({
      where: { id: row.id },
      select: { selectedAnswer: true, isCorrect: true },
    })
    if (existing?.selectedAnswer && existing.isCorrect !== null) {
      return NextResponse.json({
        selectedAnswer: existing.selectedAnswer,
        isCorrect: existing.isCorrect,
        alreadySaved: true,
      })
    }
    return NextResponse.json({ error: 'Could not save answer' }, { status: 409 })
  }

  const attemptCompleted = await finalizeFocusedPracticeIfComplete()
  return NextResponse.json({
    selectedAnswer,
    isCorrect: correct,
    alreadySaved: false,
    attemptCompleted,
  })
}
