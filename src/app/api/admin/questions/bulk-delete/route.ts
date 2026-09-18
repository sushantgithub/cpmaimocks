import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { questionIds } = body as { questionIds?: string[] }
  const force = body.force === true
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions selected' }, { status: 400 })
  }

  // A question someone has already answered corrupts that attempt's history
  // and score if removed, so it is kept unless the admin explicitly forces it.
  const answered = await prisma.examAnswer.findMany({
    where: { questionId: { in: questionIds } },
    select: { questionId: true },
    distinct: ['questionId'],
  })
  const answeredIds = new Set(answered.map((a) => a.questionId))
  const deletable = force ? questionIds : questionIds.filter((id) => !answeredIds.has(id))
  const skipped = force ? 0 : answeredIds.size

  if (deletable.length === 0) {
    return NextResponse.json({
      deleted: 0,
      skipped,
      answeredIds: Array.from(answeredIds),
      error: 'Every selected question has been answered in an exam attempt, so none can be deleted.',
    }, { status: 409 })
  }

  const affectedExams = await prisma.mockExamQuestion.groupBy({
    by: ['examId'],
    where: { questionId: { in: deletable } },
    _count: { questionId: true },
  })

  // Exam assignments, bookmarks and (if forced) exam answers are just links,
  // safe to drop ahead of the questions themselves.
  await prisma.$transaction([
    prisma.examAnswer.deleteMany({ where: { questionId: { in: deletable } } }),
    prisma.mockExamQuestion.deleteMany({ where: { questionId: { in: deletable } } }),
    prisma.bookmark.deleteMany({ where: { questionId: { in: deletable } } }),
    prisma.question.deleteMany({ where: { id: { in: deletable } } }),
  ])

  await Promise.all(
    affectedExams.map((row) =>
      prisma.mockExam.update({
        where: { id: row.examId },
        data: { questionCount: { decrement: row._count.questionId } },
      })
    )
  )

  return NextResponse.json({ deleted: deletable.length, skipped, answeredIds: Array.from(answeredIds) })
}
