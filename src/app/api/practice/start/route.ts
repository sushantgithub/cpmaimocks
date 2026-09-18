import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPracticeQuestions } from '@/lib/quiz'
import { hasAccessToCertification } from '@/lib/subscription'
import type { PracticeConfig } from '@/types'
import { subHours } from 'date-fns'

const FREE_PRACTICE_LIMIT = 10
// Free sessions reveal answers and explanations, so without a daily cap the
// whole bank could be read ten questions at a time.
const FREE_PRACTICE_DAILY_LIMIT = 30
const MAX_QUESTIONS = 100
const MODES = ['RANDOM', 'INCORRECT', 'BOOKMARKED'] as const

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
    if (!hasAccess) {
      if (config.questionCount > FREE_PRACTICE_LIMIT) {
        return NextResponse.json({
          error: `Free practice is limited to ${FREE_PRACTICE_LIMIT} questions per session. Subscribe for unlimited practice.`,
        }, { status: 402 })
      }
      const usedToday = await prisma.examAttempt.aggregate({
        _sum: { totalQuestions: true },
        where: { userId: session.user.id, mode: 'PRACTICE', createdAt: { gt: subHours(new Date(), 24) } },
      })
      const used = usedToday._sum.totalQuestions ?? 0
      if (used + config.questionCount > FREE_PRACTICE_DAILY_LIMIT) {
        const left = Math.max(0, FREE_PRACTICE_DAILY_LIMIT - used)
        return NextResponse.json({
          error: left > 0
            ? `Free accounts get ${FREE_PRACTICE_DAILY_LIMIT} practice questions a day and you have ${left} left. Pick a smaller session or subscribe for unlimited practice.`
            : `You have used today's ${FREE_PRACTICE_DAILY_LIMIT} free practice questions. Subscribe for unlimited practice, or come back tomorrow.`,
        }, { status: 402 })
      }
    }

    const questions = await getPracticeQuestions(session.user.id, config)
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for the selected filters. Try different options.' }, { status: 404 })
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: session.user.id,
        mode: 'PRACTICE',
        totalQuestions: questions.length,
        practiceConfig: JSON.parse(JSON.stringify(config)),
        answers: {
          create: questions.map((q) => ({ questionId: q.id })),
        },
      },
    })

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
