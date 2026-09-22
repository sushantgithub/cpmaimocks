import type { NextAuthConfig } from 'next-auth'

// The Edge middleware only needs to read the session cookie. Everything that
// touches the database, bcrypt or the mailer stays in auth.ts so none of it
// is bundled for the Edge runtime.
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  providers: [],
  callbacks: {
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
} satisfies NextAuthConfig
