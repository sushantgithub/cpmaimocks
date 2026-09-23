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

  const questionIds = batch.questions.map((q) => q.id)
  await prisma.$transaction(async (tx) => {
    // Batch deletion is intentionally all-or-nothing and scoped by importBatchId.
    // Never delete a partial mock's questions: doing so would silently damage
    // an assessment. Delete the mock itself first (or archive questions) once
    // product-level historical-attempt handling is defined.
    const linkedToMock = batch.questions.filter((q) => q._count.mockExamQuestions > 0)
    if (linkedToMock.length > 0) throw new Error('BATCH_HAS_MOCK_ASSIGNMENTS')

    if (questionIds.length > 0) {
      const deleted = await tx.question.deleteMany({
        where: { id: { in: questionIds }, importBatchId: batch.id },
      })
      if (deleted.count !== questionIds.length) throw new Error('BATCH_DELETE_CONFLICT')
    }
    await tx.questionImportBatch.delete({ where: { id: batch.id } })
  }).catch((error) => {
    if (error instanceof Error && error.message === 'BATCH_HAS_MOCK_ASSIGNMENTS') {
      throw error
    }
    throw error
  })

  return NextResponse.json({ success: true, deleted: questionIds.length, name: batch.name })
}
