import { describe, expect, it } from 'vitest'
import { stagingEnvironmentProblems } from './environment-safety'

const safe = {
  APP_ENV: 'staging',
  STAGING_DATABASE_PROJECT_REF: 'stageproject123',
  DATABASE_URL: 'postgresql://postgres.stageproject123:secret@pooler.supabase.com:6543/postgres',
  DIRECT_URL: 'postgresql://postgres:secret@db.stageproject123.supabase.co:5432/postgres',
  NEXT_PUBLIC_APP_URL: 'https://staging.certmocks.com',
  NEXTAUTH_URL: 'https://staging.certmocks.com',
  RAZORPAY_KEY_ID: 'rzp_test_123456',
}

describe('staging environment safety', () => {
  it('accepts an isolated staging configuration', () => {
    expect(stagingEnvironmentProblems(safe)).toEqual([])
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
      DIRECT_URL: 'postgresql://postgres:secret@db.prodproject.supabase.co:5432/postgres',
    })

    expect(problems).toContain(
      'DATABASE_URL does not point to the configured staging Supabase project',
    )
    expect(problems).toContain(
      'DIRECT_URL does not point to the configured staging Supabase project',
    )
  })

  it('blocks production app/auth URLs and live Razorpay keys', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      NEXT_PUBLIC_APP_URL: 'https://certmocks.com',
      NEXTAUTH_URL: 'https://www.certmocks.com',
      RAZORPAY_KEY_ID: 'rzp_live_123456',
    })

    expect(problems).toContain(
      'NEXT_PUBLIC_APP_URL must not point to the production CertMocks domain',
    )
    expect(problems).toContain(
      'Authentication URL must not point to the production CertMocks domain',
    )
    expect(problems).toContain('Staging must use a Razorpay test-mode key')
  })

  it('fails closed when the staging project marker is missing', () => {
    const problems = stagingEnvironmentProblems({
      ...safe,
      STAGING_DATABASE_PROJECT_REF: undefined,
    })
    expect(problems).toContain(
      'STAGING_DATABASE_PROJECT_REF is required in staging',
    )
  })
})
