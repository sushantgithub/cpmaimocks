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

  let normalized: Array<{ questionId: string; selectedAnswer?: string | null; isMarked?: boolean }>
  try {
    normalized = entries.map((entry) => {
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
  } catch {
    return NextResponse.json({ error: 'Invalid answer batch' }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const questionIds = normalized.map((entry) => entry.questionId)
      const rows = await tx.examAnswer.findMany({
        where: { attemptId: params.attemptId, questionId: { in: questionIds } },
        select: { id: true, questionId: true, isCorrect: true },
      })
      const byQuestion = new Map(rows.map((row) => [row.questionId, row]))

      if (rows.length !== new Set(questionIds).size) throw new Error('INVALID_QUESTION')

      for (const entry of normalized) {
        const row = byQuestion.get(entry.questionId)
        if (!row) throw new Error('INVALID_QUESTION')

        const data: { selectedAnswer?: string | null; isMarked?: boolean } = {}
        if (entry.selectedAnswer !== undefined && row.isCorrect === null) {
          data.selectedAnswer = entry.selectedAnswer
        }
        if (entry.isMarked !== undefined) data.isMarked = entry.isMarked

        if (Object.keys(data).length === 0) continue

        // Feedback may lock the answer between the read above and this write.
        // In that race, selectedAnswer must not overwrite the locked response;
        // a zero-row update is therefore a harmless idempotent success.
        await tx.examAnswer.updateMany({
          where: {
            id: row.id,
            attempt: { status: 'IN_PROGRESS' },
            ...(data.selectedAnswer !== undefined ? { isCorrect: null } : {}),
          },
          data,
        })
      }
    }, { timeout: 10000, maxWait: 5000 })
  } catch (err) {
    if (err instanceof Error && (err.message === 'INVALID_BATCH' || err.message === 'INVALID_QUESTION')) {
      return NextResponse.json({ error: 'Invalid answer batch' }, { status: 400 })
    }
    throw err
  }

  // Deliberately return no grading data. Checked answers are locked by the feedback endpoint.
  return NextResponse.json({ success: true })
}
