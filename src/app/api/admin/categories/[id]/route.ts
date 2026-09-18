import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

interface Params { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
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

export async function DELETE(_: Request, { params }: Params) {
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

// Reassigns every question (and topic) from this domain into another one in
// the same certification, then deletes the now-empty source domain. Used to
// consolidate categories, e.g. ten placeholder domains down to a
// certification body's real five, without losing any question's content.
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const targetId = typeof body.mergeInto === 'string' ? body.mergeInto : ''
  if (!targetId) return NextResponse.json({ error: 'mergeInto is required' }, { status: 400 })
  if (targetId === params.id) return NextResponse.json({ error: 'Cannot merge a domain into itself' }, { status: 400 })

  const [source, target] = await Promise.all([
    prisma.category.findUnique({ where: { id: params.id } }),
    prisma.category.findUnique({ where: { id: targetId } }),
  ])
  if (!source || !target) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  if (source.certificationId !== target.certificationId) {
    return NextResponse.json({ error: 'Both domains must belong to the same certification' }, { status: 400 })
  }

  const questionCount = await prisma.question.count({ where: { categoryId: source.id } })

  await prisma.$transaction(async (tx) => {
    await tx.question.updateMany({ where: { categoryId: source.id }, data: { categoryId: target.id } })
    // A topic with the same name already under the target would collide on
    // the unique [slug, categoryId] constraint, so only move the ones that don't.
    const topics = await tx.topic.findMany({ where: { categoryId: source.id } })
    const existingSlugs = new Set(
      (await tx.topic.findMany({ where: { categoryId: target.id }, select: { slug: true } })).map((t) => t.slug)
    )
    for (const topic of topics) {
      if (existingSlugs.has(topic.slug)) {
        await tx.question.updateMany({ where: { topicId: topic.id }, data: { topicId: null } })
        await tx.topic.delete({ where: { id: topic.id } })
      } else {
        await tx.topic.update({ where: { id: topic.id }, data: { categoryId: target.id } })
      }
    }
    await tx.category.delete({ where: { id: source.id } })
  })

  return NextResponse.json({ success: true, questionsMoved: questionCount })
}
