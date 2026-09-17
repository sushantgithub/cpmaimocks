import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { questionIds } = await req.json() as { questionIds?: string[] }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions selected' }, { status: 400 })
  }

  // A question someone has already answered cannot be removed without
  // corrupting that attempt's history and score, so those are kept.
  const answered = await prisma.examAnswer.findMany({
    where: { questionId: { in: questionIds } },
    select: { questionId: true },
    distinct: ['questionId'],
  })
  const blocked = new Set(answered.map((a) => a.questionId))
  const deletable = questionIds.filter((id) => !blocked.has(id))

  if (deletable.length === 0) {
    return NextResponse.json({
      deleted: 0,
      skipped: blocked.size,
      error: 'Every selected question has been answered in an exam attempt, so none can be deleted.',
    }, { status: 409 })
  }

  // Exam assignments and bookmarks are just links, safe to drop.
  await prisma.$transaction([
    prisma.mockExamQuestion.deleteMany({ where: { questionId: { in: deletable } } }),
    prisma.bookmark.deleteMany({ where: { questionId: { in: deletable } } }),
    prisma.question.deleteMany({ where: { id: { in: deletable } } }),
  ])

  // Exams that lost questions now advertise a stale count
  const affected = await prisma.mockExam.findMany({
    select: { id: true, _count: { select: { questions: true } } },
  })
  await Promise.all(
    affected.map((exam) =>
      prisma.mockExam.update({
        where: { id: exam.id },
        data: { questionCount: exam._count.questions },
      })
    )
  )

  return NextResponse.json({ deleted: deletable.length, skipped: blocked.size })
}
