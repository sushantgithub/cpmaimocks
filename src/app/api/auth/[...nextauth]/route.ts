import { handlers } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export const POST = handlers.POST

// Wrap GET to add Cache-Control: no-store on OAuth callback responses.
// Prevents Android Chrome from serving a cached callback URL from history,
// which would replay the PKCE exchange and cause InvalidCheck errors.
export async function GET(req: NextRequest) {
  const res = await handlers.GET(req)
  if (req.nextUrl.pathname.includes('/callback/')) {
    const headers = new Headers(res.headers)
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    headers.set('Pragma', 'no-cache')
    return new Response(res.body, { status: res.status, headers })
  }
  return res
}
