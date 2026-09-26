export function isTimedExamExpired(
  startedAt: Date,
  timeLimitMinutes: number,
  now = new Date(),
): boolean {
  if (timeLimitMinutes <= 0) return false
  return now.getTime() >= startedAt.getTime() + timeLimitMinutes * 60_000
}
