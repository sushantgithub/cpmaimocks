import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPracticeQuestions } from '@/lib/quiz'
import type { PracticeConfig } from '@/types'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config: PracticeConfig = await req.json()

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
