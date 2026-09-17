import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { seedDatabase } from '@/lib/seed'

function authorized(secret: string | null) {
  return Boolean(process.env.SEED_SECRET) && secret === process.env.SEED_SECRET
}

export async function GET(req: Request) {
  if (!authorized(new URL(req.url).searchParams.get('secret'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runSeed()
}

export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({ secret: null }))
  if (!authorized(secret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runSeed()
}

async function runSeed() {
  try {
    const created = await seedDatabase(prisma)
    return NextResponse.json({
      success: true,
      created,
      message: created.length > 0 ? `Created ${created.length} records` : 'Already up to date',
    })
  } catch (error) {
    console.error('[Seed]', error)
    return NextResponse.json({ error: 'Seeding failed' }, { status: 500 })
  }
}
