import { auth, handlers } from '@/lib/auth'
import { shouldBypassGoogleCallback } from '@/lib/auth-callback'

export async function GET(request: Request) {
  const url = new URL(request.url)

  // Chrome on Android can replay the OAuth callback when "Desktop site" is
  // toggled because that setting performs a full navigation. The first
  // callback has already created the JWT session and consumed the one-time
  // PKCE cookie, so replaying it makes Auth.js reject the request and sends
  // the user back to login. If a valid session already exists, the callback
  // is stale and can safely be sent to the dashboard instead.
  if (url.pathname === '/api/auth/callback/google') {
    const session = await auth()
    if (shouldBypassGoogleCallback(url.pathname, Boolean(session?.user))) {
      return Response.redirect(new URL('/dashboard', url.origin), 302)
    }
  }

  return handlers.GET(request)
}

export const POST = handlers.POST
