import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

// A session was minted within this window counts as "just created by the
// request that landed here" (the Android Chrome PKCE-replay case). Anything
// older is a pre-existing cookie that happened to still be around when an
// unrelated sign-in attempt failed, not evidence that this attempt succeeded.
const FRESH_SESSION_WINDOW_SECONDS = 30

// NextAuth routes all OAuth errors here. A session that was issued moments
// ago means the sign-in actually succeeded and this is the cosmetic PKCE
// replay error (Android Chrome's Desktop/Mobile toggle) - safe to send to
// the dashboard. A session that predates this request is someone else's
// (or an earlier) sign-in that was never cleared; treating its mere presence
// as success would silently paper over a real failure - e.g. an admin's
// stale session still being active after a different user's Google sign-in
// was rejected. That case must fall through to the login page with the
// error surfaced, not get redirected into the stale account's dashboard.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  const ageSeconds = session?.issuedAt ? Date.now() / 1000 - session.issuedAt : Infinity
  if (session && ageSeconds < FRESH_SESSION_WINDOW_SECONDS) redirect('/dashboard')

  const { error } = await searchParams
  const params = error ? `?error=${encodeURIComponent(error)}` : ''
  redirect(`/login${params}`)
}
