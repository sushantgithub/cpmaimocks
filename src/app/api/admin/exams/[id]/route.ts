import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exam = await prisma.mockExam.findUnique({
    where: { id: params.id },
    include: {
      certification: { select: { id: true, name: true } },
      questions: {
        include: {
          question: {
            select: {
              id: true,
              questionId: true,
              text: true,
              difficulty: true,
              status: true,
              contentType: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(exam)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { questionIds } = body

  if (questionIds !== undefined && !Array.isArray(questionIds)) {
    return NextResponse.json({ error: 'questionIds must be a list' }, { status: 400 })
  }

  const current = await prisma.mockExam.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      certificationId: true,
      questionCount: true,
      timeLimitMinutes: true,
      status: true,
      _count: { select: { questions: true } },
    },
  })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let targetQuestionCount = current.questionCount
  if (body.questionCount !== undefined) {
    const value = Number(body.questionCount)
    if (!Number.isInteger(value) || value < 1) {
      return NextResponse.json(
        { error: 'questionCount must be a positive whole number' },
        { status: 400 }
      )
    }

    // Product rule: remove questions from the mock first, save that change,
    // then reduce the configured target. This avoids silently deleting or
    // hiding questions just because the target was lowered.
    if (value < current._count.questions) {
      return NextResponse.json(
        {
          error: `Remove ${current._count.questions - value} question${current._count.questions - value === 1 ? '' : 's'} from this mock first, save, and then reduce the target count to ${value}.`,
          code: 'REMOVE_QUESTIONS_FIRST',
        },
        { status: 409 }
      )
    }
    targetQuestionCount = value
  }

  const uniqueQuestionIds = Array.isArray(questionIds)
    ? Array.from(new Set(questionIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : null

  if (Array.isArray(questionIds) && uniqueQuestionIds!.length !== questionIds.length) {
    return NextResponse.json({ error: 'questionIds must contain unique valid question IDs' }, { status: 400 })
  }

  const assignedCountAfterSave = uniqueQuestionIds?.length ?? current._count.questions
  if (assignedCountAfterSave > targetQuestionCount) {
    return NextResponse.json(
      {
        error: `This mock is configured for ${targetQuestionCount} questions but ${assignedCountAfterSave} would be assigned.`,
        code: 'TOO_MANY_ASSIGNED',
      },
      { status: 409 }
    )
  }

  const certificationId =
    typeof body.certificationId === 'string' && body.certificationId
      ? body.certificationId
      : current.certificationId

  if (uniqueQuestionIds && uniqueQuestionIds.length > 0) {
    const eligibleCount = await prisma.question.count({
      where: {
        id: { in: uniqueQuestionIds },
        certificationId,
      },
    })
    if (eligibleCount !== uniqueQuestionIds.length) {
      return NextResponse.json(
        { error: 'Every assigned question must belong to this certification.' },
        { status: 400 }
      )
    }
  }

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (body.description === null || typeof body.description === 'string') {
    data.description = body.description?.trim() || null
  }

  const minimum: Record<string, number> = {
    timeLimitMinutes: 1,
    passingScore: 1,
    sortOrder: 0,
  }
  for (const key of ['timeLimitMinutes', 'passingScore', 'sortOrder'] as const) {
    if (body[key] !== undefined) {
      const value = Number(body[key])
      if (!Number.isInteger(value) || value < minimum[key]) {
        return NextResponse.json(
          { error: `${key} must be a whole number of at least ${minimum[key]}` },
          { status: 400 }
        )
      }
      data[key] = value
    }
  }
  if (data.passingScore !== undefined && (data.passingScore as number) > 100) {
    return NextResponse.json({ error: 'passingScore cannot exceed 100' }, { status: 400 })
  }

  data.questionCount = targetQuestionCount
  data.questionsPerAttempt = null
  // Locked Mock Exam behavior: every attempt serves the full fixed set, with
  // a newly randomized question order and no immediate answer explanations.
  data.randomizeQuestions = true
  data.showExplanations = false

  if (typeof body.requireSubscription === 'boolean') {
    data.requireSubscription = body.requireSubscription
  }

  if (body.status !== undefined && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const effectiveStatus =
    body.status !== undefined ? body.status : current.status

  if (effectiveStatus === 'PUBLISHED') {
    if (assignedCountAfterSave !== targetQuestionCount) {
      return NextResponse.json(
        {
          error: `A published mock must be complete. Set it to Draft first, then remove questions. Target: ${targetQuestionCount}; assigned: ${assignedCountAfterSave}.`,
          code: 'QUESTION_COUNT_MISMATCH',
        },
        { status: 409 }
      )
    }

    const publishedCount = uniqueQuestionIds
      ? await prisma.question.count({
          where: { id: { in: uniqueQuestionIds }, status: 'PUBLISHED' },
        })
      : await prisma.mockExamQuestion.count({
          where: { examId: params.id, question: { status: 'PUBLISHED' } },
        })

    if (publishedCount !== targetQuestionCount) {
      return NextResponse.json(
        { error: 'All questions assigned to a published mock must themselves be published.' },
        { status: 409 }
      )
    }
  }

  if (body.status !== undefined) data.status = body.status

  if (typeof body.certificationId === 'string' && body.certificationId) {
    data.certificationId = body.certificationId
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (uniqueQuestionIds) {
      await tx.mockExamQuestion.deleteMany({ where: { examId: params.id } })
      if (uniqueQuestionIds.length > 0) {
        await tx.mockExamQuestion.createMany({
          data: uniqueQuestionIds.map((questionId, index) => ({
            examId: params.id,
            questionId,
            sortOrder: index,
          })),
        })
      }
    }

    return tx.mockExam.update({
      where: { id: params.id },
      data,
      include: {
        certification: { select: { id: true, name: true } },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                questionId: true,
                text: true,
                difficulty: true,
                status: true,
                contentType: true,
                category: { select: { name: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.mockExam.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
