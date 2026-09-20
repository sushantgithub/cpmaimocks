import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nextSitting, QUIZ_FREE_QUESTION_LIMIT, type QuizKey } from '@/lib/quizzes'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const key = typeof body.key === 'string' ? body.key : ''
    if (!/^(domain|tag):[A-Za-z0-9_-]+$/.test(key)) {
      return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 })
    }

    const sitting = await nextSitting(session.user.id, key as QuizKey)
    if (!sitting) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    if (sitting.kind === 'empty') {
      return NextResponse.json({ error: 'This quiz has no published questions yet.' }, { status: 404 })
    }
    if (sitting.kind === 'mastered') {
      return NextResponse.json({ error: 'You have already answered every question correctly.' }, { status: 409 })
    }
    if (sitting.kind === 'locked') {
      return NextResponse.json({
        error: `Free accounts get ${QUIZ_FREE_QUESTION_LIMIT} questions per quiz. View a paid plan to continue.`,
        locked: true,
      }, { status: 402 })
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: session.user.id,
        mode: 'QUIZ',
        totalQuestions: sitting.questionIds.length,
        practiceConfig: { quizKey: key, quizTitle: sitting.title },
        answers: { create: sitting.questionIds.map((questionId) => ({ questionId })) },
      },
    })

    return NextResponse.json({ attemptId: attempt.id, questionCount: sitting.questionIds.length })
  } catch (err) {
    console.error('[QuizStart]', err)
    return NextResponse.json({ error: 'Could not start the quiz' }, { status: 500 })
  }
}
