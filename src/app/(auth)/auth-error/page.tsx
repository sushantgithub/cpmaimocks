import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

// NextAuth routes all OAuth errors here. If the user already has a valid
// session (e.g. PKCE replay from Android Chrome's Desktop/Mobile toggle),
// we silently recover by sending them to the dashboard. Only truly
// unauthenticated errors fall through to the login page.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session) redirect('/dashboard')

  const { error } = await searchParams
  const params = error ? `?error=${encodeURIComponent(error)}` : ''
  redirect(`/login${params}`)
}
