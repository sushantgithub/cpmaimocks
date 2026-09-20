export const BASELINE_FREE_PLAN_SLUG = 'free'

export const BASELINE_FREE_PLAN_FEATURES = [
  'Quiz 1 (10 questions) free in each domain',
  'Basic performance stats',
]

export function isBaselineFreePlan(plan: { slug: string }) {
  return plan.slug === BASELINE_FREE_PLAN_SLUG
}

export function isPremiumPlan(plan: { slug: string }) {
  return !isBaselineFreePlan(plan)
}
