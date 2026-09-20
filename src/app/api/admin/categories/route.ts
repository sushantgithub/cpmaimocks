import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const certificationId = new URL(req.url).searchParams.get('certificationId')
  if (!certificationId) return NextResponse.json({ error: 'certificationId required' }, { status: 400 })

  const categories = await prisma.category.findMany({
    where: { certificationId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { questions: true } } },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const certificationId = typeof body.certificationId === 'string' ? body.certificationId : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!certificationId) return NextResponse.json({ error: 'certificationId required' }, { status: 400 })

  const certification = await prisma.certification.findUnique({ where: { id: certificationId } })
  if (!certification) return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  if (!certification.usesDomains) {
    return NextResponse.json(
      { error: 'Domains are disabled for this certification' },
      { status: 409 }
    )
  }

  const slug = slugify(name)
  const clash = await prisma.category.findFirst({
    where: { certificationId, OR: [{ name }, { slug }] },
  })
  if (clash) return NextResponse.json({ error: 'A domain with that name already exists for this certification' }, { status: 409 })

  const count = await prisma.category.count({ where: { certificationId } })
  const category = await prisma.category.create({
    data: { name, slug, certificationId, sortOrder: count },
  })
  return NextResponse.json(category)
}
