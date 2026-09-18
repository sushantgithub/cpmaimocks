import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const question = await prisma.question.findUnique({ where: { id: params.id } })
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(question)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  for (const key of ['text', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation'] as const) {
    if (typeof body[key] === 'string') {
      const value = body[key].trim()
      if (!value) return NextResponse.json({ error: `${key} cannot be empty` }, { status: 400 })
      data[key] = value
    }
  }
  if (body.correctAnswer !== undefined) {
    const answer = String(body.correctAnswer).toUpperCase()
    if (!['A', 'B', 'C', 'D'].includes(answer)) return NextResponse.json({ error: 'correctAnswer must be A, B, C or D' }, { status: 400 })
    data.correctAnswer = answer
  }
  if (body.difficulty !== undefined) {
    if (!['EASY', 'MEDIUM', 'HARD'].includes(body.difficulty)) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
    data.difficulty = body.difficulty
  }
  if (body.status !== undefined) {
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    data.status = body.status
  }
  for (const key of ['categoryId', 'topicId', 'source'] as const) {
    if (body[key] === null || typeof body[key] === 'string') data[key] = body[key] || null
  }
  if (Array.isArray(body.tags)) data.tags = body.tags.filter((t: unknown): t is string => typeof t === 'string')
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const question = await prisma.question.update({ where: { id: params.id }, data })
  return NextResponse.json(question)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.question.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
