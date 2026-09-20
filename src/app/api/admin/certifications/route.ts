import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const certifications = await prisma.certification.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { questions: true, exams: true, categories: true } },
    },
  })
  return NextResponse.json(certifications)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const name = (data.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = slugify(name)
  const clash = await prisma.certification.findFirst({ where: { OR: [{ name }, { slug }] } })
  if (clash) return NextResponse.json({ error: 'A certification with that name already exists' }, { status: 409 })

  const count = await prisma.certification.count()
  const certification = await prisma.certification.create({
    data: {
      name,
      slug,
      fullName: data.fullName?.trim() || null,
      description: data.description?.trim() || null,
      usesDomains: typeof data.usesDomains === 'boolean' ? data.usesDomains : true,
      sortOrder: count,
    },
  })
  return NextResponse.json(certification)
}
