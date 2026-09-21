import { describe, expect, it } from 'vitest'
import { isStagingEnvironment, stagingEnvironmentProblems } from './environment-safety'

const safe = {
  APP_ENV: 'staging',
  STAGING_DATABASE_PROJECT_REF: 'stageproject123',
  DATABASE_URL: 'postgresql://postgres.stageproject123:secret@pooler.supabase.com:6543/postgres',
  DIRECT_URL: 'postgresql://postgres.stageproject123:secret@pooler.supabase.com:5432/postgres',
  NEXT_PUBLIC_APP_URL: 'https://staging.certmocks.com',
  NEXTAUTH_URL: 'https://staging.certmocks.com',
  NEXTAUTH_SECRET: 'staging-secret-only',
  RAZORPAY_KEY_ID: 'rzp_test_123456',
}

describe('staging environment safety', () => {
  it('accepts an isolated staging configuration', () => {
    expect(stagingEnvironmentProblems(safe)).toEqual([])
  })

  it('detects staging from the Vercel Git branch even when APP_ENV is absent', () => {
    expect(isStagingEnvironment({ VERCEL_GIT_COMMIT_REF: 'staging' })).toBe(true)
    expect(stagingEnvironmentProblems({
      ...safe,
      APP_ENV: undefined,
      NEXT_PUBLIC_APP_URL: undefined,
      NEXTAUTH_URL: undefined,
      VERCEL_GIT_COMMIT_REF: 'staging',
      VERCEL_BRANCH_URL: 'cpmaimocks-git-staging-cpmaiprep.vercel.app',
    })).toEqual([])
  })

  it('does nothing outside staging', () => {
    expect(stagingEnvironmentProblems({
      APP_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://certmocks.com',
      RAZORPAY_KEY_ID: 'rzp_live_123',
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

  it('blocks production URLs and live Razorpay keys', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      NEXT_PUBLIC_APP_URL: 'https://certmocks.com',
      NEXTAUTH_URL: 'https://www.certmocks.com',
      RAZORPAY_KEY_ID: 'rzp_live_123456',
    })

    expect(problems).toContain(
      'Staging app URL must not point to the production CertMocks domain',
    )
    expect(problems).toContain(
      'Authentication URL must not point to the production CertMocks domain',
    )
    expect(problems).toContain('Staging must use a Razorpay test-mode key')
  })

  it('fails closed when required staging identity settings are missing', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      STAGING_DATABASE_PROJECT_REF: undefined,
      NEXTAUTH_SECRET: undefined,
    })
    expect(problems).toContain(
      'STAGING_DATABASE_PROJECT_REF is required in staging',
    )
    expect(problems).toContain(
      'NEXTAUTH_SECRET (or AUTH_SECRET) is required in staging',
    )
  })

  it('blocks inherited SMTP and Google OAuth credentials by default', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      SMTP_USER: 'resend',
      SMTP_PASS: 'production-like-secret',
      GOOGLE_CLIENT_ID: 'prod-client',
      GOOGLE_CLIENT_SECRET: 'prod-secret',
    })

    expect(problems).toContain(
      'Staging SMTP is blocked unless STAGING_EMAIL_ALLOW_SEND=true',
    )
    expect(problems).toContain(
      'Staging Google OAuth is blocked unless STAGING_OAUTH_ALLOW_GOOGLE=true',
    )
  })

  it('allows explicitly enabled staging SMTP only with a clearly staging sender', () => {
    expect(stagingEnvironmentProblems({
      ...safe,
      SMTP_USER: 'resend',
      SMTP_PASS: 'staging-secret',
      STAGING_EMAIL_ALLOW_SEND: 'true',
      EMAIL_FROM_NAME: 'CertMocks Staging',
    })).toEqual([])
  })
})
