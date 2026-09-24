import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (Object.prototype.hasOwnProperty.call(body, 'tag')) {
    return NextResponse.json(
      { error: 'Quiz ownership tags are managed internally and cannot be edited.' },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } })
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const slug = slugify(title)
    const clash = await prisma.quiz.findFirst({
      where: {
        certificationId: quiz.certificationId,
        slug,
        id: { not: params.id },
      },
    })
    if (clash) {
      return NextResponse.json(
        { error: 'A quiz with that name already exists here' },
        { status: 409 }
      )
    }

    data.title = title
    data.slug = slug
  }

  if (typeof body.description === 'string') {
    data.description = body.description.trim() || null
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const quiz = await prisma.quiz.update({ where: { id: params.id }, data })
  return NextResponse.json(quiz)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      certificationId: true,
      categoryId: true,
      tag: true,
    },
  })
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Persisted Quiz records own QUIZ questions carrying their internal tag in
  // the same certification and domain. A question carrying another active Quiz
  // tag is shared and must survive this deletion.
  const siblingTags = (
    await prisma.quiz.findMany({
      where: {
        certificationId: quiz.certificationId,
        categoryId: quiz.categoryId,
        id: { not: quiz.id },
        isActive: true,
      },
      select: { tag: true },
    })
  ).map((item) => item.tag)

  const owned = await prisma.question.findMany({
    where: {
      certificationId: quiz.certificationId,
      categoryId: quiz.categoryId,
      contentType: 'QUIZ',
      tags: { has: quiz.tag },
      ...(siblingTags.length > 0
        ? { NOT: { tags: { hasSome: siblingTags } } }
        : {}),
    },
    select: { id: true },
  })
  const questionIds = owned.map((question) => question.id)

  await prisma.$transaction(async (tx) => {
    if (questionIds.length > 0) {
      const answers = await tx.examAnswer.findMany({
        where: { questionId: { in: questionIds } },
        select: { attemptId: true },
      })
      const attemptIds = Array.from(new Set(answers.map((answer) => answer.attemptId)))

      if (attemptIds.length > 0) {
        await tx.examAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } })
        await tx.examAttempt.deleteMany({
          where: { id: { in: attemptIds }, mode: 'QUIZ' },
        })
      }

      await tx.bookmark.deleteMany({ where: { questionId: { in: questionIds } } })
      const deleted = await tx.question.deleteMany({
        where: { id: { in: questionIds }, contentType: 'QUIZ' },
      })
      if (deleted.count !== questionIds.length) {
        throw new Error('QUIZ_DELETE_CONFLICT')
      }
    }

    await tx.quiz.delete({ where: { id: quiz.id } })
  })

  return NextResponse.json({
    success: true,
    deletedQuestions: questionIds.length,
  })
}
