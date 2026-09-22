import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

// Auth.js only forwards a small whitelist of "client-safe" error types to
// this page as-is (AccessDenied, OAuthCallbackError, OAuthAccountNotLinked,
// Verification, MissingCSRF, CredentialsSignin, WebAuthnVerificationError).
// Everything else - including PKCE/state/nonce check failures, which is what
// Android Chrome's Desktop/Mobile toggle triggers by replaying a consumed
// callback URL - collapses to the generic "Configuration" code.
//
// That makes "Configuration" a reliable signal that whatever went wrong was
// a plumbing glitch rather than a real rejection of this sign-in attempt. A
// genuine failure (denied consent, blocked account, provider restrictions)
// always carries one of the specific codes instead. So only "Configuration"
// is treated as "safe to check for a session and recover silently" - for
// every other code we go to /login with the error shown, even if a session
// happens to exist, because that session belongs to whoever was already
// signed in and has nothing to do with this failed attempt.
const SILENTLY_RECOVERABLE_ERROR = 'Configuration'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const session = error === SILENTLY_RECOVERABLE_ERROR ? await auth() : null
  if (session) redirect('/dashboard')

  const params = error ? `?error=${encodeURIComponent(error)}` : ''
  redirect(`/login${params}`)
}
