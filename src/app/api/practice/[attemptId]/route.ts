import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { attemptId: string } }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        answers: {
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
                correctAnswer: true,
                explanation: true,
                difficulty: true,
                category: { select: { name: true } },
                topic: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (attempt.mode !== 'PRACTICE' && attempt.mode !== 'QUIZ') {
      return NextResponse.json({ error: 'Not a practice attempt' }, { status: 400 })
    }

    const questions = attempt.answers.map((a) => ({
      ...a.question,
      category: a.question.category?.name,
      topic: a.question.topic?.name,
      selectedAnswer: a.selectedAnswer,
    }))

    return NextResponse.json({ attempt, questions })
  } catch (err) {
    console.error('[GetPracticeAttempt]', err)
    return NextResponse.json({ error: 'Failed to load practice session' }, { status: 500 })
  }
}
