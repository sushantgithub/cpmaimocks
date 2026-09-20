import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  prepareQuizSitting,
  QUIZ_FREE_QUESTION_LIMIT,
  type QuizKey,
  type QuizStartAction,
} from '@/lib/quizzes'

const ACTIONS = new Set<QuizStartAction>([
  'start',
  'retake',
  'retryIncorrect',
  'mixedReview',
])

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const key = typeof body.key === 'string' ? body.key : ''
    if (!/^(domain|tag):[A-Za-z0-9_-]+$/.test(key)) {
      return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 })
    }

    const action: QuizStartAction = ACTIONS.has(body.action)
      ? body.action
      : 'start'
    const quizNumber =
      typeof body.quizNumber === 'number' && Number.isInteger(body.quizNumber)
        ? body.quizNumber
        : null

    const sitting = await prepareQuizSitting(
      session.user.id,
      key as QuizKey,
      quizNumber,
      action,
    )
    if (!sitting) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    if (sitting.kind === 'resume') {
      return NextResponse.json({ attemptId: sitting.attemptId, resumed: true })
    }
    if (sitting.kind === 'empty') {
      return NextResponse.json(
        { error: 'This quiz has no published questions available.' },
        { status: 404 },
      )
    }
    if (sitting.kind === 'completed') {
      return NextResponse.json(
        {
          error: 'This quiz is already completed. Use Retake to make another attempt.',
          attemptId: sitting.attemptId,
        },
        { status: 409 },
      )
    }
    if (sitting.kind === 'sequence_locked') {
      return NextResponse.json(
        { error: 'Complete Quiz ' + sitting.previousQuizNumber + ' first.' },
        { status: 409 },
      )
    }
    if (sitting.kind === 'no_incorrect') {
      return NextResponse.json(
        { error: 'There are no incorrect answers to retry in this quiz.' },
        { status: 409 },
      )
    }
    if (sitting.kind === 'mastered') {
      return NextResponse.json(
        { error: 'No weak questions remain in this domain.' },
        { status: 409 },
      )
    }
    if (sitting.kind === 'locked') {
      const error =
        sitting.reason === 'free_used'
          ? 'Your free Quiz 1 attempt is complete. Review remains available; a paid plan is required to retake it or open Quiz 2–6.'
          : 'A paid plan is required for this quiz.'
      return NextResponse.json(
        { error, locked: true, freeLimit: QUIZ_FREE_QUESTION_LIMIT },
        { status: 402 },
      )
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: session.user.id,
        mode: 'QUIZ',
        totalQuestions: sitting.questionIds.length,
        practiceConfig: {
          quizKey: key,
          quizTitle: sitting.title,
          accessTier: sitting.accessTier,
          quizNumber: sitting.quizNumber,
          sessionKind: sitting.sessionKind,
          questionIds: sitting.questionIds,
        },
        answers: {
          create: sitting.questionIds.map((questionId) => ({ questionId })),
        },
      },
    })

    return NextResponse.json({
      attemptId: attempt.id,
      questionCount: sitting.questionIds.length,
      resumed: false,
    })
  } catch (err) {
    console.error('[QuizStart]', err)
    return NextResponse.json({ error: 'Could not start the quiz' }, { status: 500 })
  }
}
