import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const difficulty = searchParams.get('difficulty') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { text: { contains: search, mode: 'insensitive' } },
      { questionId: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (difficulty) where.difficulty = difficulty

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      select: {
        id: true,
        questionId: true,
        text: true,
        difficulty: true,
        status: true,
        category: { select: { name: true } },
        topic: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.question.count({ where }),
  ])

  return NextResponse.json({ questions, total, pages: Math.ceil(total / limit) })
}
