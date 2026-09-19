import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeAnswer } from '@/lib/answers'

interface SaveEntry {
  questionId?: unknown
  selectedAnswer?: unknown
  isMarked?: unknown
}

export async function PATCH(req: Request, { params }: { params: { attemptId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const entries: SaveEntry[] = Array.isArray(body.answers) ? body.answers : []
  if (entries.length === 0 || entries.length > 200) {
    return NextResponse.json({ error: 'Invalid answer batch' }, { status: 400 })
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: params.attemptId },
    select: {
      userId: true,
      status: true,
      mode: true,
      startedAt: true,
      exam: { select: { timeLimitMinutes: true } },
    },
  })

  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (attempt.mode !== 'EXAM' || attempt.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Attempt is not active', code: 'ATTEMPT_CLOSED' }, { status: 409 })
  }

  const limitSeconds = (attempt.exam?.timeLimitMinutes ?? 0) * 60
  const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000)
  if (limitSeconds > 0 && elapsedSeconds >= limitSeconds) {
    return NextResponse.json({ error: 'Exam time has expired', code: 'TIME_EXPIRED' }, { status: 409 })
  }

  const normalized = entries.map((entry) => {
    if (typeof entry.questionId !== 'string' || !entry.questionId) throw new Error('INVALID_BATCH')
    if (entry.isMarked !== undefined && typeof entry.isMarked !== 'boolean') throw new Error('INVALID_BATCH')
    if (entry.selectedAnswer !== undefined && entry.selectedAnswer !== null && typeof entry.selectedAnswer !== 'string') {
      throw new Error('INVALID_BATCH')
    }
    return {
      questionId: entry.questionId,
      selectedAnswer: entry.selectedAnswer === undefined
        ? undefined
        : (normalizeAnswer(entry.selectedAnswer as string | null) || null),
      isMarked: entry.isMarked as boolean | undefined,
    }
  })

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of normalized) {
        const data: { selectedAnswer?: string | null; isMarked?: boolean } = {}
        if (entry.selectedAnswer !== undefined) data.selectedAnswer = entry.selectedAnswer
        if (entry.isMarked !== undefined) data.isMarked = entry.isMarked

        const updated = await tx.examAnswer.updateMany({
          where: {
            attemptId: params.attemptId,
            questionId: entry.questionId,
            attempt: { status: 'IN_PROGRESS' },
          },
          data,
        })
        if (updated.count !== 1) throw new Error('INVALID_QUESTION')
      }
    }, { timeout: 10000, maxWait: 5000 })
  } catch (err) {
    if (err instanceof Error && (err.message === 'INVALID_BATCH' || err.message === 'INVALID_QUESTION')) {
      return NextResponse.json({ error: 'Invalid answer batch' }, { status: 400 })
    }
    throw err
  }

  // Deliberately return no grading data. Correctness is computed only at submission.
  return NextResponse.json({ success: true })
}
