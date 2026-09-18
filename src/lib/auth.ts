import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // Registered only when credentials exist, so the sign-in page never offers
    // a Google button that cannot work.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Google verifies email ownership, so trust it to link a Google
            // sign-in to an account already registered with the same address.
            // Without this, that person hits OAuthAccountNotLinked and is stuck.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = String(credentials.email).trim().toLowerCase()
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user || !user.passwordHash) return null
        if (!user.isActive) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  events: {
    // Fires only for adapter-created users, i.e. first-time Google sign-ins.
    // Password sign-ups are created by the register route, which mails separately.
    async createUser({ user }) {
      if (!user.id || !user.email) return
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
      await prisma.analyticsEvent.create({ data: { event: 'USER_REGISTERED', userId: user.id } })
      try {
        // Loaded lazily: this module is also bundled into the Edge middleware,
        // where nodemailer's Node networking imports cannot be evaluated.
        const { sendWelcomeEmail } = await import('@/lib/email')
        await sendWelcomeEmail(user.email, user.name || 'there')
      } catch (err) {
        console.error('[Auth] welcome email failed', err)
      }
    },
  },
  callbacks: {
    // Credentials already checks isActive; this closes the same door for Google
    async signIn({ user }) {
      if (!user.email) return false
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      })
      return existing ? existing.isActive : true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'USER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
