import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isAnswerCorrect, normalizeAnswer } from '@/lib/answers'
import { isFullMockExam } from '@/lib/mock-exams'

export async function POST(req: Request, { params }: { params: { attemptId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const questionId = typeof body.questionId === 'string' ? body.questionId : ''
  const selectedAnswer = normalizeAnswer(typeof body.selectedAnswer === 'string' ? body.selectedAnswer : '')
  if (!questionId || !selectedAnswer) return NextResponse.json({ error: 'Answer required' }, { status: 400 })

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: params.attemptId, userId: session.user.id, status: 'IN_PROGRESS', mode: 'EXAM' },
    select: {
      startedAt: true,
      exam: {
        select: {
          timeLimitMinutes: true,
          showExplanations: true,
          questionCount: true,
          questionsPerAttempt: true,
        },
      },
    },
  })
  if (!attempt) return NextResponse.json({ error: 'Attempt is not active' }, { status: 409 })
  if (
    !attempt.exam?.showExplanations ||
    isFullMockExam({
      questionCount: attempt.exam.questionCount,
      questionsPerAttempt: attempt.exam.questionsPerAttempt,
      timeLimitMinutes: attempt.exam.timeLimitMinutes,
    })
  ) {
    return NextResponse.json(
      { error: 'Feedback is available only after this Mock Exam is submitted' },
      { status: 403 }
    )
  }

  const limitSeconds = attempt.exam.timeLimitMinutes * 60
  if (limitSeconds > 0 && Date.now() - attempt.startedAt.getTime() >= limitSeconds * 1000) {
    return NextResponse.json({ error: 'Exam time has expired', code: 'TIME_EXPIRED' }, { status: 409 })
  }

  const row = await prisma.examAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: params.attemptId, questionId } },
    include: { question: true },
  })
  if (!row) return NextResponse.json({ error: 'Question is not in this attempt' }, { status: 404 })

  // isCorrect doubles as the server-side "feedback revealed" lock. Once the
  // learner has seen the key, the scored answer can no longer be changed.
  const lockedAnswer = row.isCorrect === null ? selectedAnswer : row.selectedAnswer
  if (!lockedAnswer) return NextResponse.json({ error: 'Answer required' }, { status: 400 })
  const correct = isAnswerCorrect(lockedAnswer, row.question.correctAnswer)

  if (row.isCorrect === null) {
    const locked = await prisma.examAnswer.updateMany({
      where: { id: row.id, isCorrect: null, attempt: { status: 'IN_PROGRESS' } },
      data: { selectedAnswer: lockedAnswer, isCorrect: correct },
    })
    if (locked.count !== 1) return NextResponse.json({ error: 'Could not lock answer' }, { status: 409 })
  }

  const q = row.question
  return NextResponse.json({
    selectedAnswer: lockedAnswer,
    isCorrect: correct,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    explanationA: q.explanationA,
    explanationB: q.explanationB,
    explanationC: q.explanationC,
    explanationD: q.explanationD,
    explanationE: q.explanationE,
    explanationF: q.explanationF,
  })
}
