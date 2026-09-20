import { describe, expect, it } from 'vitest'
import { BASELINE_FREE_PLAN_FEATURES, isBaselineFreePlan } from './subscription-plans'

describe('baseline free plan', () => {
  it('identifies only the free tier as baseline access', () => {
    expect(isBaselineFreePlan({ slug: 'free' })).toBe(true)
    expect(isBaselineFreePlan({ slug: 'monthly' })).toBe(false)
  })

  it('describes the quiz allowance explicitly', () => {
    expect(BASELINE_FREE_PLAN_FEATURES).toContain('1 free 10-question session in each quiz')
  })
})
