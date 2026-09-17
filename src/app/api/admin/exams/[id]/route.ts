import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exam = await prisma.mockExam.findUnique({
    where: { id: params.id },
    include: {
      questions: {
        include: { question: { select: { id: true, questionId: true, text: true, difficulty: true, category: { select: { name: true } } } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(exam)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionIds, ...data } = await req.json()

  const exam = await prisma.mockExam.update({ where: { id: params.id }, data })

  if (Array.isArray(questionIds)) {
    await prisma.mockExamQuestion.deleteMany({ where: { examId: params.id } })
    if (questionIds.length > 0) {
      await prisma.mockExamQuestion.createMany({
        data: questionIds.map((qId: string, i: number) => ({ examId: params.id, questionId: qId, sortOrder: i })),
      })
    }
    // Always resync, so clearing an exam doesn't leave a stale count advertised.
    const updated = await prisma.mockExam.update({
      where: { id: params.id },
      data: { questionCount: questionIds.length },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json(exam)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.mockExam.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
