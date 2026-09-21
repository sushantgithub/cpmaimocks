import { describe, expect, it } from 'vitest'
import {
  authSecretForEnvironment,
  isStagingEnvironment,
  stagingEmailSendingAllowed,
  stagingEnvironmentProblems,
  stagingGoogleOAuthAllowed,
  stagingRazorpayAllowed,
} from './environment-safety'

const safe = {
  APP_ENV: 'staging',
  STAGING_DATABASE_PROJECT_REF: 'stageproject123',
  DATABASE_URL: 'postgresql://postgres.stageproject123:secret@pooler.supabase.com:6543/postgres',
  DIRECT_URL: 'postgresql://postgres.stageproject123:secret@pooler.supabase.com:5432/postgres',
  VERCEL_BRANCH_URL: 'cpmaimocks-git-staging-cpmaiprep.vercel.app',
  NEXTAUTH_SECRET: 'staging-secret-only',
}

describe('staging environment safety', () => {
  it('accepts the minimal isolated staging configuration', () => {
    expect(stagingEnvironmentProblems(safe)).toEqual([])
  })

  it('detects staging from the Vercel Git branch', () => {
    expect(isStagingEnvironment({ VERCEL_GIT_COMMIT_REF: 'staging' })).toBe(true)
    expect(stagingEnvironmentProblems({
      ...safe,
      APP_ENV: undefined,
      VERCEL_GIT_COMMIT_REF: 'staging',
    })).toEqual([])
  })

  it('ignores inherited production app/auth URLs when Vercel provides the staging branch URL', () => {
    expect(stagingEnvironmentProblems({
      ...safe,
      NEXT_PUBLIC_APP_URL: 'https://certmocks.com',
      NEXTAUTH_URL: 'https://certmocks.com',
    })).toEqual([])
  })

  it('does nothing outside staging', () => {
    expect(stagingEnvironmentProblems({
      APP_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://certmocks.com',
    })).toEqual([])
  })

  it('blocks production database credentials by project marker', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      DATABASE_URL: 'postgresql://postgres.prodproject:secret@pooler.supabase.com:6543/postgres',
      DIRECT_URL: 'postgresql://postgres.prodproject:secret@pooler.supabase.com:5432/postgres',
    })

    expect(problems).toContain(
      'DATABASE_URL does not point to the configured staging Supabase project',
    )
    expect(problems).toContain(
      'DIRECT_URL does not point to the configured staging Supabase project',
    )
  })

  it('requires the branch-scoped NextAuth secret in staging', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      NEXTAUTH_SECRET: undefined,
    })
    expect(problems).toContain('NEXTAUTH_SECRET (or AUTH_SECRET) is required in staging')
    expect(authSecretForEnvironment({
      ...safe,
      NEXTAUTH_SECRET: undefined,
    })).toBeUndefined()
  })

  it('uses the branch-scoped auth secret in staging and production', () => {
    expect(authSecretForEnvironment(safe)).toBe('staging-secret-only')
    expect(authSecretForEnvironment({
      APP_ENV: 'production',
      NEXTAUTH_SECRET: 'production-secret',
    })).toBe('production-secret')
  })

  it('suppresses inherited email and Google OAuth in staging by default', () => {
    expect(stagingEmailSendingAllowed(safe)).toBe(false)
    expect(stagingGoogleOAuthAllowed(safe)).toBe(false)
    expect(stagingEmailSendingAllowed({
      ...safe,
      STAGING_EMAIL_ALLOW_SEND: 'true',
    })).toBe(true)
    expect(stagingGoogleOAuthAllowed({
      ...safe,
      STAGING_OAUTH_ALLOW_GOOGLE: 'true',
    })).toBe(true)
  })

  it('permits Razorpay in staging only with test-mode credentials', () => {
    expect(stagingRazorpayAllowed({
      ...safe,
      RAZORPAY_KEY_ID: 'rzp_live_prod',
      RAZORPAY_KEY_SECRET: 'prod-secret',
    })).toBe(false)
    expect(stagingRazorpayAllowed({
      ...safe,
      RAZORPAY_KEY_ID: 'rzp_test_stage',
      RAZORPAY_KEY_SECRET: 'stage-secret',
    })).toBe(true)
  })
})
