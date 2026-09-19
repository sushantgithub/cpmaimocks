export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type OptionKey = (typeof OPTION_KEYS)[number]

/**
 * Answers are stored as sorted, comma-separated letters so that "C,A" and
 * "A,C" are the same answer however the person clicked them.
 */
export function normalizeAnswer(raw: string | null | undefined): string {
  if (!raw) return ''
  const letters = raw
    .toUpperCase()
    .split(/[,\s;|]+/)
    .map((s) => s.trim())
    .filter((s): s is OptionKey => (OPTION_KEYS as readonly string[]).includes(s))
  return Array.from(new Set(letters)).sort().join(',')
}

export function answerLetters(raw: string | null | undefined): string[] {
  const n = normalizeAnswer(raw)
  return n ? n.split(',') : []
}

/** How many options a question expects, so the taker can be told "select two". */
export function expectedCount(correctAnswer: string) {
  return answerLetters(correctAnswer).length || 1
}

/** PMI marks multiple-response questions all or nothing: no partial credit. */
export function isAnswerCorrect(selected: string | null | undefined, correct: string) {
  const s = normalizeAnswer(selected)
  return s.length > 0 && s === normalizeAnswer(correct)
}
