export const BASELINE_FREE_PLAN_SLUG = 'free'

export const BASELINE_FREE_PLAN_FEATURES = [
  '1 free 10-question session in each quiz',
  'Basic performance stats',
]

export function isBaselineFreePlan(plan: { slug: string }) {
  return plan.slug === BASELINE_FREE_PLAN_SLUG
}

export function isPremiumPlan(plan: { slug: string }) {
  return !isBaselineFreePlan(plan)
}
