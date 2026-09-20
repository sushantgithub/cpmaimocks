export const ADMIN_TEST_ACCESS_MARKER = 'ADMIN_TEST_ACCESS'

export function isAdminTestAccess(subscription: { cancellationReason: string | null | undefined }) {
  return subscription.cancellationReason === ADMIN_TEST_ACCESS_MARKER
}

export function adminAccessEndDate(start: Date, days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) return null
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + days)
  return end
}
