import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeAnswer } from '@/lib/answers'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const question = await prisma.question.findUnique({ where: { id: params.id } })
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(question)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  for (const key of ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'] as const) {
    if (typeof body[key] === 'string') {
      const value = body[key].trim()
      if (!value) return NextResponse.json({ error: `${key} cannot be empty` }, { status: 400 })
      data[key] = value
    }
  }
  if (body.correctAnswer !== undefined) {
    const answer = normalizeAnswer(String(body.correctAnswer))
    if (!answer) return NextResponse.json({ error: 'correctAnswer must be one or more of A-F' }, { status: 400 })
    data.correctAnswer = answer
  }
  for (const key of ['optionE', 'optionF'] as const) {
    if (body[key] === null || typeof body[key] === 'string') data[key] = body[key]?.trim() || null
  }
  if (body.difficulty !== undefined) {
    if (!['EASY', 'MEDIUM', 'HARD'].includes(body.difficulty)) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
    data.difficulty = body.difficulty
  }
  if (body.status !== undefined) {
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
  }
  for (const key of ['categoryId', 'topicId', 'source'] as const) {
    if (body[key] === null || typeof body[key] === 'string') data[key] = body[key] || null
  }
  if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown): t is string => typeof t === 'string')
  if (typeof body.isTest === 'boolean') data.isTest = body.isTest
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const question = await prisma.question.update({ where: { id: params.id }, data })
  return NextResponse.json(question)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const force = new URL(req.url).searchParams.get('force') === 'true'

  const answered = await prisma.examAnswer.count({ where: { questionId: params.id } })
  if (answered > 0 && !force) {
    return NextResponse.json({
      error: `This question has been answered ${answered} time(s) in exam or practice attempts.`,
      answered,
    }, { status: 409 })
  }

  const affectedExamIds = (
    await prisma.mockExamQuestion.findMany({ where: { questionId: params.id }, select: { examId: true } })
  ).map((row) => row.examId)

  await prisma.$transaction([
    // Deleting the answer only removes that one question from a past attempt's
    // review; the attempt's stored score and counts are untouched.
    prisma.examAnswer.deleteMany({ where: { questionId: params.id } }),
    prisma.bookmark.deleteMany({ where: { questionId: params.id } }),
    prisma.mockExamQuestion.deleteMany({ where: { questionId: params.id } }),
    prisma.question.delete({ where: { id: params.id } }),
  ])

  await Promise.all(
    affectedExamIds.map((examId) =>
      prisma.mockExam.update({
        where: { id: examId },
        data: { questionCount: { decrement: 1 } },
      })
    )
  )

  return NextResponse.json({ success: true, answeredRemoved: answered })
}
