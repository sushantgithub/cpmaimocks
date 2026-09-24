import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batches = await prisma.questionImportBatch.findMany({
    include: {
      certification: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(batches)
}
