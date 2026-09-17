import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { generateToken } from '@/lib/utils'
import { addHours } from 'date-fns'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    })

    const token = generateToken()
    await prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt: addHours(new Date(), 24) },
    })

    // Send verification email (don't fail registration if email fails)
    try {
      await sendVerificationEmail(email, name, token)
    } catch {
      // Email failure logged but registration succeeds
    }

    // Track analytics
    await prisma.analyticsEvent.create({
      data: { event: 'USER_REGISTERED', userId: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Register]', err)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
