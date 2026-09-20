import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPracticeQuestions } from '@/lib/quiz'
import { hasAccessToCertification } from '@/lib/subscription'
import {
  countFreePracticeUsage,
  getFreePracticeAccess,
} from '@/lib/free-practice-access'
import type { PracticeConfig } from '@/types'

const MAX_QUESTIONS = 100
const MODES = ['RANDOM', 'INCORRECT', 'BOOKMARKED'] as const

async function loadFreePracticeAccess(userId: string, certificationId: string) {
  const attempts = await prisma.examAttempt.findMany({
    where: { userId, mode: 'PRACTICE' },
    select: { totalQuestions: true, practiceConfig: true },
  })
  return getFreePracticeAccess(countFreePracticeUsage(attempts, certificationId))
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const certificationId = new URL(req.url).searchParams.get('certificationId')
    if (!certificationId) {
      return NextResponse.json({ error: 'Pick a certification to practise' }, { status: 400 })
    }

    const hasAccess = await hasAccessToCertification(session.user.id, certificationId)
    if (hasAccess) {
      return NextResponse.json({
        unlimited: true,
        limit: null,
        used: null,
        remaining: null,
      })
    }

    const access = await loadFreePracticeAccess(session.user.id, certificationId)
    return NextResponse.json({ unlimited: false, ...access })
  } catch (err) {
    console.error('[PracticeAccess]', err)
    return NextResponse.json({ error: 'Failed to load practice access' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = await req.json().catch(() => ({}))
    const questionCount = Number.isInteger(raw.questionCount) && raw.questionCount > 0
      ? Math.min(raw.questionCount, MAX_QUESTIONS)
      : 20
    const strings = (value: unknown) =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined
    const config: PracticeConfig = {
      questionCount,
      certificationId: typeof raw.certificationId === 'string' ? raw.certificationId : undefined,
      difficulty: strings(raw.difficulty)?.filter((d): d is 'EASY' | 'MEDIUM' | 'HARD' => ['EASY', 'MEDIUM', 'HARD'].includes(d)),
      categoryIds: strings(raw.categoryIds),
      topicIds: strings(raw.topicIds),
      mode: MODES.includes(raw.mode) ? raw.mode : 'RANDOM',
    }

    if (!config.certificationId) {
      return NextResponse.json({ error: 'Pick a certification to practise' }, { status: 400 })
    }

    const hasAccess = await hasAccessToCertification(session.user.id, config.certificationId)
    const questions = await getPracticeQuestions(session.user.id, config)

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for the selected filters. Try different options.' }, { status: 404 })
    }

    const createAttemptData = {
      userId: session.user.id,
      mode: 'PRACTICE',
      totalQuestions: questions.length,
      practiceConfig: JSON.parse(JSON.stringify({
        ...config,
        accessTier: hasAccess ? 'PREMIUM' : 'FREE',
      })),
      answers: {
        create: questions.map((q) => ({ questionId: q.id })),
      },
    }

    let attempt

    if (hasAccess) {
      attempt = await prisma.examAttempt.create({ data: createAttemptData })
    } else {
      // Re-check the lifetime allowance inside a serializable transaction so
      // parallel requests cannot consume more than the free 25-question grant.
      const outcome = await prisma.$transaction(async (tx) => {
        const priorAttempts = await tx.examAttempt.findMany({
          where: { userId: session.user.id, mode: 'PRACTICE' },
          select: { totalQuestions: true, practiceConfig: true },
        })
        const access = getFreePracticeAccess(
          countFreePracticeUsage(priorAttempts, config.certificationId as string)
        )

        if (questions.length > access.remaining) {
          return { blocked: true as const, access }
        }

        const created = await tx.examAttempt.create({ data: createAttemptData })
        return { blocked: false as const, attempt: created }
      }, { isolationLevel: 'Serializable' })

      if (outcome.blocked) {
        const { remaining, limit } = outcome.access
        return NextResponse.json({
          error: remaining > 0
            ? `You have ${remaining} of ${limit} free practice questions remaining for this certification. Choose ${remaining} or fewer, or subscribe for unlimited practice.`
            : `You have used all ${limit} free practice questions for this certification. Subscribe for unlimited practice.`,
          remaining,
          limit,
        }, { status: 402 })
      }

      attempt = outcome.attempt
    }

    return NextResponse.json({
      attemptId: attempt.id,
      questionCount: questions.length,
      requested: config.questionCount,
    })
  } catch (err) {
    console.error('[StartPractice]', err)
    return NextResponse.json({ error: 'Failed to start practice session' }, { status: 500 })
  }
}
