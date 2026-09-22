import type { NextAuthConfig } from 'next-auth'
import { authSecretForEnvironment } from '@/lib/environment-safety'

const secureCookies = process.env.NODE_ENV === 'production'

// Pin Auth.js cookie names across every Vercel hostname. Auth.js otherwise
// derives the secure prefix from the request URL; switching browser modes can
// cause a full navigation that exposes different host/proxy metadata and makes
// the existing JWT or OAuth PKCE cookie appear to vanish.
const cookies = {
  sessionToken: {
    name: `${secureCookies ? '__Secure-' : ''}authjs.session-token`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies },
  },
  callbackUrl: {
    name: `${secureCookies ? '__Secure-' : ''}authjs.callback-url`,
    options: { sameSite: 'lax' as const, path: '/', secure: secureCookies },
  },
  csrfToken: {
    name: `${secureCookies ? '__Host-' : ''}authjs.csrf-token`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies },
  },
  pkceCodeVerifier: {
    name: `${secureCookies ? '__Secure-' : ''}authjs.pkce.code_verifier`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies, maxAge: 900 },
  },
  state: {
    name: `${secureCookies ? '__Secure-' : ''}authjs.state`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies, maxAge: 900 },
  },
  nonce: {
    name: `${secureCookies ? '__Secure-' : ''}authjs.nonce`,
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: secureCookies },
  },
}

// The Edge middleware only needs to read the session cookie. Everything that
// touches the database, bcrypt or the mailer stays in auth.ts so none of it
// is bundled for the Edge runtime.
export const authConfig = {
  secret: authSecretForEnvironment(),
  trustHost: true,
  useSecureCookies: secureCookies,
  cookies,
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
