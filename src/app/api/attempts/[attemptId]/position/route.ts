import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readQuizAttemptConfig } from '@/lib/quiz-entitlement'
import { mergeQuizResumePosition } from '@/lib/quiz-resume'

export async function PATCH(
  req: Request,
  { params }: { params: { attemptId: string } },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const questionIndex =
    typeof body.questionIndex === 'number' && Number.isInteger(body.questionIndex)
      ? body.questionIndex
      : -1

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: params.attemptId,
      userId: session.user.id,
      status: 'IN_PROGRESS',
      mode: 'QUIZ',
    },
    select: {
      id: true,
      totalQuestions: true,
      practiceConfig: true,
    },
  })

  if (!attempt) {
    return NextResponse.json({ error: 'Quiz attempt is not active' }, { status: 409 })
  }

  if (questionIndex < 0 || questionIndex >= attempt.totalQuestions) {
    return NextResponse.json({ error: 'Invalid question position' }, { status: 400 })
  }

  const quizConfig = readQuizAttemptConfig(attempt.practiceConfig)
  if (!quizConfig) {
    return NextResponse.json({ error: 'Quiz metadata is invalid' }, { status: 409 })
  }

  await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      practiceConfig: mergeQuizResumePosition(
        attempt.practiceConfig,
        questionIndex,
      ),
    },
  })

  return NextResponse.json({ questionIndex })
}
