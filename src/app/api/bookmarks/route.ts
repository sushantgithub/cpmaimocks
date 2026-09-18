import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    include: {
      question: {
        select: {
          id: true,
          questionId: true,
          text: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          correctAnswer: true,
          explanation: true,
          difficulty: true,
          category: { select: { name: true } },
          topic: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bookmarks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionId } = await req.json().catch(() => ({}))
  if (typeof questionId !== 'string' || !questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })

  const question = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } })
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  await prisma.bookmark.upsert({
    where: { userId_questionId: { userId: session.user.id, questionId } },
    create: { userId: session.user.id, questionId },
    update: {},
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { questionId } = await req.json().catch(() => ({}))
  if (typeof questionId !== 'string' || !questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })

  await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, questionId },
  })

  return NextResponse.json({ success: true })
}
