import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** Counts what a cleanup would remove, so the confirmation can be specific. */
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.question.count({ where: { isTest: true } })
  return NextResponse.json({ count })
}

export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questions = await prisma.question.findMany({ where: { isTest: true }, select: { id: true } })
  const ids = questions.map((q) => q.id)
  if (ids.length === 0) return NextResponse.json({ deleted: 0 })

  const affectedExams = await prisma.mockExamQuestion.groupBy({
    by: ['examId'],
    where: { questionId: { in: ids } },
    _count: { questionId: true },
  })

  // Test questions go whether or not someone has answered them: that is the
  // point of marking them, and the attempts involved are test attempts too.
  await prisma.$transaction([
    prisma.examAnswer.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.mockExamQuestion.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.bookmark.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.question.deleteMany({ where: { id: { in: ids } } }),
  ])

  await Promise.all(
    affectedExams.map((row) =>
      prisma.mockExam.update({
        where: { id: row.examId },
        data: { questionCount: { decrement: row._count.questionId } },
      })
    )
  )

  return NextResponse.json({ deleted: ids.length })
}
