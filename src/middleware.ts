import { auth } from '@/lib/auth'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/exams') ||
      pathname.startsWith('/practice') || pathname.startsWith('/results') ||
      pathname.startsWith('/bookmarks') || pathname.startsWith('/profile') ||
      pathname.startsWith('/subscription')) {
    if (!req.auth) {
      return Response.redirect(new URL('/login', req.url))
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!req.auth) return Response.redirect(new URL('/login', req.url))
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
