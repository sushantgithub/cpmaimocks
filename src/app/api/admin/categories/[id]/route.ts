import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })

    const category = await prisma.category.findUnique({ where: { id: params.id } })
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const slug = slugify(name)
    const clash = await prisma.category.findFirst({
      where: { certificationId: category.certificationId, OR: [{ name }, { slug }], id: { not: params.id } },
    })
    if (clash) return NextResponse.json({ error: 'A domain with that name already exists for this certification' }, { status: 409 })

    update.name = name
    update.slug = slug
  }
  if (typeof body.sortOrder === 'number') update.sortOrder = body.sortOrder
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const category = await prisma.category.update({ where: { id: params.id }, data: update })
  return NextResponse.json(category)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questions = await prisma.question.count({ where: { categoryId: params.id } })
  if (questions > 0) {
    return NextResponse.json(
      { error: `${questions} question(s) still use this domain. Move or delete them first, or rename the domain instead.` },
      { status: 409 }
    )
  }

  // Topics are just subdivisions of the domain, safe to drop with it
  await prisma.$transaction([
    prisma.topic.deleteMany({ where: { categoryId: params.id } }),
    prisma.category.delete({ where: { id: params.id } }),
  ])
  return NextResponse.json({ success: true })
}
