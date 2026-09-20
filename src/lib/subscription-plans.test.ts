import { describe, expect, it } from 'vitest'
import { BASELINE_FREE_PLAN_FEATURES, isBaselineFreePlan, isPremiumPlan } from './subscription-plans'

describe('baseline free plan', () => {
  it('identifies only the free tier as baseline access', () => {
    expect(isBaselineFreePlan({ slug: 'free' })).toBe(true)
    expect(isBaselineFreePlan({ slug: 'monthly' })).toBe(false)
  })

  it('describes the free quiz and lifetime practice allowance', () => {
    expect(BASELINE_FREE_PLAN_FEATURES).toContain('Quiz 1 (10 questions) free in each domain')
    expect(BASELINE_FREE_PLAN_FEATURES).toContain('25 practice questions free per certification')
    expect(BASELINE_FREE_PLAN_FEATURES).not.toContain('1 mini mock exam')
  })

  it('never treats the baseline free tier as a premium entitlement', () => {
    expect(isPremiumPlan({ slug: 'free' })).toBe(false)
    expect(isPremiumPlan({ slug: 'monthly' })).toBe(true)
  })
})
