type EnvLike = Record<string, string | undefined>

function hostname(value: string | undefined) {
  if (!value) return ''
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function stagingEnvironmentProblems(env: EnvLike): string[] {
  if (env.APP_ENV !== 'staging') return []

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

  const publicHost = hostname(env.NEXT_PUBLIC_APP_URL)
  if (!publicHost) {
    problems.push('NEXT_PUBLIC_APP_URL must be a valid staging URL')
  } else if (publicHost === 'certmocks.com' || publicHost === 'www.certmocks.com') {
    problems.push('NEXT_PUBLIC_APP_URL must not point to the production CertMocks domain')
  }

  const authHost = hostname(env.NEXTAUTH_URL || env.AUTH_URL)
  if (!authHost) {
    problems.push('NEXTAUTH_URL (or AUTH_URL) must be a valid staging URL')
  } else if (authHost === 'certmocks.com' || authHost === 'www.certmocks.com') {
    problems.push('Authentication URL must not point to the production CertMocks domain')
  }

  const razorpayKey = env.RAZORPAY_KEY_ID?.trim()
  if (razorpayKey && !razorpayKey.startsWith('rzp_test_')) {
    problems.push('Staging must use a Razorpay test-mode key')
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
