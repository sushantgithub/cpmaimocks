import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { clientIp, throttle } from '@/lib/rate-limit'
import { issueMobileToken } from '@/lib/mobile-auth'
import { stagingGoogleOAuthAllowed } from '@/lib/environment-safety'

interface GoogleTokenInfo {
  iss?: string
  aud?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
}

function verifiedEmail(value: GoogleTokenInfo['email_verified']) {
  return value === true || value === 'true'
}

export async function POST(req: Request) {
  try {
    if (
      !stagingGoogleOAuthAllowed() ||
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET
    ) {
      return NextResponse.json({ error: 'Google sign-in is not available' }, { status: 503 })
    }

    if (await throttle('mobile-google', clientIp(req.headers), 20, 15)) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please try again in a few minutes.' },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : ''
    if (!idToken || idToken.length > 10000) {
      return NextResponse.json({ error: 'Google ID token required' }, { status: 400 })
    }

    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { cache: 'no-store' },
    )
    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'Google sign-in could not be verified' }, { status: 401 })
    }

    const google = (await verifyResponse.json()) as GoogleTokenInfo
    const issuerOk =
      google.iss === 'accounts.google.com' ||
      google.iss === 'https://accounts.google.com'

    if (
      google.aud !== process.env.GOOGLE_CLIENT_ID ||
      !issuerOk ||
      !google.sub ||
      !google.email ||
      !verifiedEmail(google.email_verified)
    ) {
      return NextResponse.json({ error: 'Google sign-in could not be verified' }, { status: 401 })
    }

    const email = google.email.trim().toLowerCase()
    const providerAccountId = google.sub

    const existingGoogleAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId,
        },
      },
      select: { userId: true },
    })

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    })

    if (
      existingGoogleAccount &&
      existingUser &&
      existingGoogleAccount.userId !== existingUser.id
    ) {
      return NextResponse.json({ error: 'Google account is linked to another user' }, { status: 409 })
    }

    if (existingUser && !existingUser.isActive) {
      return NextResponse.json({ error: 'This account is inactive' }, { status: 403 })
    }

    const isNewUser = !existingUser
    const user = await prisma.$transaction(async (tx) => {
      const current = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerified: existingUser.emailVerified ?? new Date(),
              name: existingUser.name ?? google.name ?? undefined,
              image: existingUser.image ?? google.picture ?? undefined,
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              isActive: true,
            },
          })
        : await tx.user.create({
            data: {
              email,
              emailVerified: new Date(),
              name: google.name ?? null,
              image: google.picture ?? null,
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              isActive: true,
            },
          })

      if (existingGoogleAccount) {
        if (existingGoogleAccount.userId !== current.id) {
          throw new Error('GOOGLE_ACCOUNT_CONFLICT')
        }
      } else {
        await tx.account.create({
          data: {
            userId: current.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId,
          },
        })
      }

      if (isNewUser) {
        await tx.analyticsEvent.create({
          data: { event: 'USER_REGISTERED', userId: current.id },
        })
      }

      return current
    })

    if (!user.isActive) {
      return NextResponse.json({ error: 'This account is inactive' }, { status: 403 })
    }

    if (isNewUser) {
      try {
        const { sendWelcomeEmail } = await import('@/lib/email')
        await sendWelcomeEmail(user.email, user.name || 'there')
      } catch (error) {
        console.error('[MobileGoogleAuth] welcome email failed', error)
      }
    }

    const mobile = issueMobileToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return NextResponse.json({
      success: true,
      token: mobile.token,
      expiresAt: mobile.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'GOOGLE_ACCOUNT_CONFLICT') {
      return NextResponse.json({ error: 'Google account is linked to another user' }, { status: 409 })
    }
    console.error('[MobileGoogleAuth]', error)
    return NextResponse.json({ error: 'Google sign-in failed' }, { status: 500 })
  }
}
