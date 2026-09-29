import { describe, expect, it } from 'vitest'
import { isBaselineFreePlan, isPremiumPlan } from './subscription-plans'

describe('baseline free plan', () => {
  it('identifies only the free tier as baseline access', () => {
    expect(isBaselineFreePlan({ slug: 'free' })).toBe(true)
    expect(isBaselineFreePlan({ slug: 'monthly' })).toBe(false)
  })

  it('never treats the baseline free tier as a premium entitlement', () => {
    expect(isPremiumPlan({ slug: 'free' })).toBe(false)
    expect(isPremiumPlan({ slug: 'monthly' })).toBe(true)
  })
})
