import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        include: { question: { select: { id: true, questionId: true, text: true, difficulty: true, category: { select: { name: true } } } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(exam)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { questionIds } = body
  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (body.description === null || typeof body.description === 'string') data.description = body.description?.trim() || null
  // Zero is meaningful for a time limit: a domain mock is untimed. It is not
  // meaningful for a pass mark, where it would pass every attempt.
  const MINIMUM: Record<string, number> = { timeLimitMinutes: 0, passingScore: 1, sortOrder: 0 }
  for (const key of ['timeLimitMinutes', 'passingScore', 'sortOrder'] as const) {
    if (body[key] !== undefined) {
      const value = Number(body[key])
      if (!Number.isInteger(value) || value < MINIMUM[key]) {
        return NextResponse.json(
          { error: `${key} must be a whole number of at least ${MINIMUM[key]}` }, { status: 400 })
      }
      data[key] = value
    }
  }
  if (data.passingScore !== undefined && (data.passingScore as number) > 100) {
    return NextResponse.json({ error: 'passingScore cannot exceed 100' }, { status: 400 })
  }
  // Null serves the whole pool. A number must be at least 1, and is capped
  // below against the pool size once that is known.
  if (body.questionsPerAttempt !== undefined) {
    if (body.questionsPerAttempt === null || body.questionsPerAttempt === '') {
      data.questionsPerAttempt = null
    } else {
      const value = Number(body.questionsPerAttempt)
      if (!Number.isInteger(value) || value < 1) {
        return NextResponse.json(
          { error: 'questionsPerAttempt must be a whole number of at least 1, or empty to serve the whole pool' },
          { status: 400 })
      }
      data.questionsPerAttempt = value
    }
  }
  for (const key of ['requireSubscription', 'randomizeQuestions', 'showExplanations'] as const) {
    if (typeof body[key] === 'boolean') data[key] = body[key]
  }
  if (body.status !== undefined) {
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
  }
  if (typeof body.certificationId === 'string' && body.certificationId) data.certificationId = body.certificationId
  if (questionIds !== undefined && !Array.isArray(questionIds)) {
    return NextResponse.json({ error: 'questionIds must be a list' }, { status: 400 })
  }

  const exam = await prisma.mockExam.update({ where: { id: params.id }, data })

  if (Array.isArray(questionIds)) {
    await prisma.mockExamQuestion.deleteMany({ where: { examId: params.id } })
    if (questionIds.length > 0) {
      await prisma.mockExamQuestion.createMany({
        data: questionIds.map((qId: string, i: number) => ({ examId: params.id, questionId: qId, sortOrder: i })),
      })
    }
    // Always resync, so clearing an exam doesn't leave a stale count advertised.
    const updated = await prisma.mockExam.update({
      where: { id: params.id },
      data: { questionCount: questionIds.length },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json(exam)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.mockExam.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
