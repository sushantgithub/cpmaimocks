import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

function loginRedirect(req: { url: string; nextUrl: { pathname: string; search: string } }) {
  const url = new URL('/login', req.url)
  url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search)
  return Response.redirect(url)
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Edge middleware performs the fast signed-JWT presence check only. It does
  // not query Prisma, so current isActive/role state is enforced by the
  // database-backed server guards and API auth checks after this point.
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/practice') ||
    pathname.startsWith('/quizzes') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/bookmarks') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/admin')
  ) {
    if (!req.auth) return loginRedirect(req)
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/exams/:path*',
    '/practice/:path*',
    '/quizzes/:path*',
    '/results/:path*',
    '/bookmarks/:path*',
    '/profile/:path*',
    '/subscription/:path*',
    '/admin/:path*',
  ],
}
