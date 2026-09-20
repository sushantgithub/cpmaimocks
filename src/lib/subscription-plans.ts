export const BASELINE_FREE_PLAN_SLUG = 'free'

export const BASELINE_FREE_PLAN_FEATURES = [
  '1 free 10-question session in each quiz',
  '1 mini mock exam',
  'Basic performance stats',
]

export function isBaselineFreePlan(plan: { slug: string }) {
  return plan.slug === BASELINE_FREE_PLAN_SLUG
}
