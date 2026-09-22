export function shouldBypassGoogleCallback(pathname: string, hasSession: boolean) {
  return hasSession && pathname === '/api/auth/callback/google'
}
