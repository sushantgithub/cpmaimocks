import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quizzes = await prisma.quiz.findMany({
    orderBy: [{ certificationId: 'asc' }, { sortOrder: 'asc' }],
    include: { certification: { select: { id: true, name: true } } },
  })

  // How many published questions each tag actually reaches, so an admin can
  // see at a glance that a quiz is empty because nothing carries its tag.
  const counts = await Promise.all(
    quizzes.map((q) =>
      prisma.question.count({
        where: { status: 'PUBLISHED', certificationId: q.certificationId, tags: { has: q.tag } },
      })
    )
  )

  return NextResponse.json(quizzes.map((q, i) => ({ ...q, questionCount: counts[i] })))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : ''
  const certificationId = typeof body.certificationId === 'string' ? body.certificationId : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!title) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!tag) return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
  if (!certificationId) return NextResponse.json({ error: 'Certification is required' }, { status: 400 })

  const certification = await prisma.certification.findUnique({ where: { id: certificationId } })
  if (!certification) return NextResponse.json({ error: 'Certification not found' }, { status: 404 })

  const slug = slugify(title)
  const clash = await prisma.quiz.findFirst({ where: { certificationId, slug } })
  if (clash) return NextResponse.json({ error: 'A quiz with that name already exists here' }, { status: 409 })

  const count = await prisma.quiz.count({ where: { certificationId } })
  const quiz = await prisma.quiz.create({
    data: { title, slug, tag, certificationId, description: description || null, sortOrder: count },
  })
  return NextResponse.json(quiz)
}
