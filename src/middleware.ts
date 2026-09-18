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

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/exams') ||
      pathname.startsWith('/practice') || pathname.startsWith('/results') ||
      pathname.startsWith('/bookmarks') || pathname.startsWith('/profile') ||
      pathname.startsWith('/subscription')) {
    if (!req.auth) return loginRedirect(req)
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!req.auth) return loginRedirect(req)
    if (req.auth.user.role !== 'ADMIN') return Response.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/exams/:path*',
    '/practice/:path*',
    '/results/:path*',
    '/bookmarks/:path*',
    '/profile/:path*',
    '/subscription/:path*',
    '/admin/:path*',
  ],
}
