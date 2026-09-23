import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      _count: { select: { questions: true } },
      questions: {
        select: {
          id: true,
          _count: { select: { examAnswers: true, bookmarks: true, mockExamQuestions: true } },
        },
      },
    },
  })
  if (!batch) return NextResponse.json({ error: 'Import batch not found' }, { status: 404 })

  const used = batch.questions.filter((q) => q._count.examAnswers > 0 || q._count.bookmarks > 0)
  if (used.length > 0) {
    return NextResponse.json({
      error: `${used.length} question(s) in this batch have learner history or bookmarks. The batch was not deleted.`,
      code: 'BATCH_HAS_HISTORY',
      questionCount: batch._count.questions,
      protectedCount: used.length,
    }, { status: 409 })
  }

  const linkedToMock = batch.questions.filter((q) => q._count.mockExamQuestions > 0)
  if (linkedToMock.length > 0) {
    return NextResponse.json({
      error: `${linkedToMock.length} question(s) in this batch are assigned to a Mock Exam. Remove/delete the assessment relationship safely before deleting this batch.`,
      code: 'BATCH_HAS_MOCK_ASSIGNMENTS',
      questionCount: batch._count.questions,
      protectedCount: linkedToMock.length,
    }, { status: 409 })
  }

  const questionIds = batch.questions.map((q) => q.id)
  try {
    await prisma.$transaction(async (tx) => {
      if (questionIds.length > 0) {
        const deleted = await tx.question.deleteMany({
          where: { id: { in: questionIds }, importBatchId: batch.id },
        })
        if (deleted.count !== questionIds.length) throw new Error('BATCH_DELETE_CONFLICT')
      }
      await tx.questionImportBatch.delete({ where: { id: batch.id } })
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'BATCH_DELETE_CONFLICT') {
      return NextResponse.json({
        error: 'This batch changed while it was being deleted. Nothing was partially deleted; refresh and retry.',
        code: 'BATCH_DELETE_CONFLICT',
      }, { status: 409 })
    }
    throw error
  }

  return NextResponse.json({ success: true, deleted: questionIds.length, name: batch.name })
}
