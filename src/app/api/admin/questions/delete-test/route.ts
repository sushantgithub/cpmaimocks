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
  // Attempts that answered these questions are about to lose every answer
  // behind them. Left in place they keep reporting a score for questions that
  // no longer exist, which is what someone sees as "already attempted".
  const touchedAttempts = await prisma.examAnswer.findMany({
    where: { questionId: { in: ids } },
    select: { attemptId: true },
    distinct: ['attemptId'],
  })
  const attemptIds = touchedAttempts.map((a) => a.attemptId)

  await prisma.$transaction([
    prisma.examAnswer.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.mockExamQuestion.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.bookmark.deleteMany({ where: { questionId: { in: ids } } }),
    prisma.question.deleteMany({ where: { id: { in: ids } } }),
  ])

  // Only the ones left with nothing: an attempt that also covered real
  // questions keeps its remaining answers and its place in the user's history.
  let emptiedAttempts = 0
  if (attemptIds.length > 0) {
    const survivors = await prisma.examAnswer.findMany({
      where: { attemptId: { in: attemptIds } },
      select: { attemptId: true },
      distinct: ['attemptId'],
    })
    const stillHasAnswers = new Set(survivors.map((a) => a.attemptId))
    const empty = attemptIds.filter((id) => !stillHasAnswers.has(id))
    if (empty.length > 0) {
      const removed = await prisma.examAttempt.deleteMany({ where: { id: { in: empty } } })
      emptiedAttempts = removed.count
    }
  }

  await Promise.all(
    affectedExams.map((row) =>
      prisma.mockExam.update({
        where: { id: row.examId },
        data: { questionCount: { decrement: row._count.questionId } },
      })
    )
  )

  return NextResponse.json({ deleted: ids.length, attemptsRemoved: emptiedAttempts })
}
