import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  if (Object.prototype.hasOwnProperty.call(body, 'tag')) {
    return NextResponse.json(
      { error: 'Quiz ownership tags are managed internally and cannot be edited.' },
      { status: 400 }
    )
  }

  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } })
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const slug = slugify(title)
    const clash = await prisma.quiz.findFirst({
      where: {
        certificationId: quiz.certificationId,
        slug,
        id: { not: params.id },
      },
    })
    if (clash) {
      return NextResponse.json(
        { error: 'A quiz with that name already exists here' },
        { status: 409 }
      )
    }

    data.title = title
    data.slug = slug
  }

  if (typeof body.description === 'string') {
    data.description = body.description.trim() || null
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const quiz = await prisma.quiz.update({ where: { id: params.id }, data })
  return NextResponse.json(quiz)
}

export async function DELETE() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        'Individual Quiz deletion is disabled. Delete the original Quiz import batch from Import History instead.',
    },
    { status: 405 }
  )
}
