import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const certificationId = new URL(req.url).searchParams.get('certificationId')

  const categories = await prisma.category.findMany({
    where: certificationId ? { certificationId } : undefined,
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, certificationId: true },
  })
  return NextResponse.json(categories)
}
