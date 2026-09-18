import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPracticeQuestions } from '@/lib/quiz'
import { hasAccessToCertification } from '@/lib/subscription'
import type { PracticeConfig } from '@/types'

const FREE_PRACTICE_LIMIT = 10

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config: PracticeConfig = await req.json()

    if (!config.certificationId) {
      return NextResponse.json({ error: 'Pick a certification to practise' }, { status: 400 })
    }

    // Practice was previously open to anyone signed in, which gave the whole
    // question bank away. Free users get a capped taste of it instead.
    const hasAccess = await hasAccessToCertification(session.user.id, config.certificationId)
    if (!hasAccess && config.questionCount > FREE_PRACTICE_LIMIT) {
      return NextResponse.json({
        error: `Free practice is limited to ${FREE_PRACTICE_LIMIT} questions. Subscribe for unlimited practice.`,
      }, { status: 402 })
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

    return NextResponse.json({ attemptId: attempt.id, questionCount: questions.length })
  } catch (err) {
    console.error('[StartPractice]', err)
    return NextResponse.json({ error: 'Failed to start practice session' }, { status: 500 })
  }
}
