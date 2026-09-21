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

export function authSecretForEnvironment(env: EnvLike = process.env) {
  if (isStagingEnvironment(env)) {
    return env.NEXTAUTH_SECRET?.trim() || env.AUTH_SECRET?.trim() || undefined
  }
  return env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim() || undefined
}

export function stagingEmailSendingAllowed(env: EnvLike = process.env) {
  return !isStagingEnvironment(env) || env.STAGING_EMAIL_ALLOW_SEND === 'true'
}

export function stagingGoogleOAuthAllowed(env: EnvLike = process.env) {
  return !isStagingEnvironment(env) || env.STAGING_OAUTH_ALLOW_GOOGLE === 'true'
}

export function stagingRazorpayAllowed(env: EnvLike = process.env) {
  if (!isStagingEnvironment(env)) return true
  return Boolean(
    env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') &&
    env.RAZORPAY_KEY_SECRET?.trim()
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

  // On Vercel the generated branch URL is authoritative for staging. This
  // deliberately ignores inherited Preview NEXTAUTH_URL/NEXT_PUBLIC_APP_URL
  // values that may still point at production.
  const branchUrl = vercelBranchUrl(env)
  const publicHost = hostname(branchUrl || env.NEXT_PUBLIC_APP_URL)
  if (!publicHost) {
    problems.push('VERCEL_BRANCH_URL or NEXT_PUBLIC_APP_URL must provide a valid staging URL')
  } else if (publicHost === 'certmocks.com' || publicHost === 'www.certmocks.com') {
    problems.push('Staging app URL must not point to the production CertMocks domain')
  }

  const authHost = hostname(branchUrl || env.AUTH_URL || env.NEXTAUTH_URL)
  if (!authHost) {
    problems.push('VERCEL_BRANCH_URL, AUTH_URL, or NEXTAUTH_URL must provide a valid staging auth URL')
  } else if (authHost === 'certmocks.com' || authHost === 'www.certmocks.com') {
    problems.push('Authentication URL must not point to the production CertMocks domain')
  }

  if (!env.NEXTAUTH_SECRET?.trim() && !env.AUTH_SECRET?.trim()) {
    problems.push('NEXTAUTH_SECRET (or AUTH_SECRET) is required in staging')
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
