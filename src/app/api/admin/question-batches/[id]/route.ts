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
    if (questionIds.length > 0) {
      await tx.mockExamQuestion.deleteMany({ where: { questionId: { in: questionIds } } })
      await tx.question.deleteMany({ where: { id: { in: questionIds }, importBatchId: batch.id } })
    }
    await tx.questionImportBatch.delete({ where: { id: batch.id } })
  })

  return NextResponse.json({ success: true, deleted: questionIds.length, name: batch.name })
}
