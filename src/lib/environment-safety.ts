type EnvLike = Record<string, string | undefined>

function hostname(value: string | undefined) {
  if (!value) return ''
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function vercelBranchUrl(env: EnvLike) {
  const host = env.VERCEL_BRANCH_URL?.trim()
  return host ? `https://${host}` : undefined
}

export function isStagingEnvironment(env: EnvLike = process.env) {
  return (
    env.APP_ENV === 'staging' ||
    env.NEXT_PUBLIC_APP_ENV === 'staging' ||
    env.VERCEL_GIT_COMMIT_REF === 'staging'
  )
}

export function stagingEnvironmentProblems(env: EnvLike): string[] {
  if (!isStagingEnvironment(env)) return []

  const problems: string[] = []
  const marker = env.STAGING_DATABASE_PROJECT_REF?.trim()

  if (!marker) {
    problems.push('STAGING_DATABASE_PROJECT_REF is required in staging')
  }

  for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const value = env[key]
    if (!value) {
      problems.push(`${key} is required in staging`)
    } else if (marker && !value.includes(marker)) {
      problems.push(`${key} does not point to the configured staging Supabase project`)
    }
  }

  const branchUrl = vercelBranchUrl(env)
  const publicHost = hostname(env.NEXT_PUBLIC_APP_URL || branchUrl)
  if (!publicHost) {
    problems.push('NEXT_PUBLIC_APP_URL or VERCEL_BRANCH_URL must provide a valid staging URL')
  } else if (publicHost === 'certmocks.com' || publicHost === 'www.certmocks.com') {
    problems.push('Staging app URL must not point to the production CertMocks domain')
  }

  const authHost = hostname(env.NEXTAUTH_URL || env.AUTH_URL || branchUrl)
  if (!authHost) {
    problems.push('NEXTAUTH_URL, AUTH_URL, or VERCEL_BRANCH_URL must provide a valid staging auth URL')
  } else if (authHost === 'certmocks.com' || authHost === 'www.certmocks.com') {
    problems.push('Authentication URL must not point to the production CertMocks domain')
  }

  if (!(env.NEXTAUTH_SECRET || env.AUTH_SECRET)?.trim()) {
    problems.push('NEXTAUTH_SECRET (or AUTH_SECRET) is required in staging')
  }

  const razorpayKey = env.RAZORPAY_KEY_ID?.trim()
  if (razorpayKey && !razorpayKey.startsWith('rzp_test_')) {
    problems.push('Staging must use a Razorpay test-mode key')
  }

  const hasSmtpCredentials = Boolean(env.SMTP_PASS?.trim() || env.SMTP_USER?.trim())
  if (hasSmtpCredentials && env.STAGING_EMAIL_ALLOW_SEND !== 'true') {
    problems.push('Staging SMTP is blocked unless STAGING_EMAIL_ALLOW_SEND=true')
  }
  if (
    hasSmtpCredentials &&
    env.STAGING_EMAIL_ALLOW_SEND === 'true' &&
    !env.EMAIL_FROM_NAME?.toLowerCase().includes('staging')
  ) {
    problems.push('Staging email sender name must clearly include "Staging"')
  }

  const hasGoogleOAuth = Boolean(env.GOOGLE_CLIENT_ID?.trim() || env.GOOGLE_CLIENT_SECRET?.trim())
  if (hasGoogleOAuth && env.STAGING_OAUTH_ALLOW_GOOGLE !== 'true') {
    problems.push('Staging Google OAuth is blocked unless STAGING_OAUTH_ALLOW_GOOGLE=true')
  }

  return problems
}

export function assertSafeStagingEnvironment(env: EnvLike = process.env) {
  const problems = stagingEnvironmentProblems(env)
  if (problems.length === 0) return

  throw new Error(
    'Unsafe staging configuration:\n- ' + problems.join('\n- ')
  )
}
