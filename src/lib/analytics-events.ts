/**
 * Funnel event names sent to Vercel Analytics, kept in one place so a call
 * site and a dashboard filter can't drift out of sync on spelling.
 */
export const ANALYTICS_EVENTS = {
  PRICING_VIEWED: 'pricing_viewed',
  FREE_QUESTIONS_VIEWED: 'free_questions_viewed',
  REGISTER_STARTED: 'register_started',
  REGISTER_COMPLETED: 'register_completed',
  CHECKOUT_STARTED: 'checkout_started',
  PURCHASE_COMPLETED: 'purchase_completed',
} as const
