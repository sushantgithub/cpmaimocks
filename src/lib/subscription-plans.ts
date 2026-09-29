export const BASELINE_FREE_PLAN_SLUG = 'free'

export function isBaselineFreePlan(plan: { slug: string }) {
  return plan.slug === BASELINE_FREE_PLAN_SLUG
}

export function isPremiumPlan(plan: { slug: string }) {
  return !isBaselineFreePlan(plan)
}
