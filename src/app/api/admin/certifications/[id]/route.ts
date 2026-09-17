import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const update: Record<string, unknown> = {}
  if (typeof data.fullName === 'string') update.fullName = data.fullName.trim() || null
  if (typeof data.description === 'string') update.description = data.description.trim() || null
  if (typeof data.isActive === 'boolean') update.isActive = data.isActive
  if (typeof data.sortOrder === 'number') update.sortOrder = data.sortOrder

  const certification = await prisma.certification.update({ where: { id: params.id }, data: update })
  return NextResponse.json(certification)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [questions, exams] = await Promise.all([
    prisma.question.count({ where: { certificationId: params.id } }),
    prisma.mockExam.count({ where: { certificationId: params.id } }),
  ])

  if (questions > 0 || exams > 0) {
    return NextResponse.json(
      { error: `Still holds ${questions} question(s) and ${exams} exam(s). Deactivate it instead, or move that content first.` },
      { status: 409 }
    )
  }

  await prisma.certification.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
