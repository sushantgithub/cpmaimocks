import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { generateToken, normalizeEmail, isValidEmail } from '@/lib/tokens'
import { addHours } from 'date-fns'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
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

    // Registration still succeeds if the mail fails: login does not require verification
    try {
      await sendVerificationEmail(email, name, token)
    } catch (err) {
      console.error('[Register] verification email failed', err)
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
