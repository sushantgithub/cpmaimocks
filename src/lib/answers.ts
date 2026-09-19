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

export interface ExplanationRow {
  key: OptionKey
  text: string
  why: string
  correct: boolean
  chosen: boolean
}

interface ExplainableQuestion {
  optionA: string; optionB: string; optionC: string; optionD: string
  optionE?: string | null; optionF?: string | null
  correctAnswer: string
  explanationA?: string | null; explanationB?: string | null
  explanationC?: string | null; explanationD?: string | null
  explanationE?: string | null; explanationF?: string | null
}

/**
 * The options that have both text and an explanation, in A-F order. An option
 * with no explanation written for it is left out rather than shown blank,
 * which is what keeps questions imported before these columns existed working.
 */
export function explanationRows(
  q: ExplainableQuestion,
  selected: string | null | undefined,
): ExplanationRow[] {
  const options: Record<string, string | null | undefined> = {
    A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD, E: q.optionE, F: q.optionF,
  }
  const whys: Record<string, string | null | undefined> = {
    A: q.explanationA, B: q.explanationB, C: q.explanationC,
    D: q.explanationD, E: q.explanationE, F: q.explanationF,
  }
  const correct = answerLetters(q.correctAnswer)
  const chosen = answerLetters(selected)

  return OPTION_KEYS.filter((k) => options[k]?.trim() && whys[k]?.trim()).map((k) => ({
    key: k,
    text: options[k]!.trim(),
    why: whys[k]!.trim(),
    correct: correct.includes(k),
    chosen: chosen.includes(k),
  }))
}

/**
 * Splits the rows into what a learner sees straight away and what stays folded
 * away: their own option and the correct one lead, the rest follow. With
 * nothing selected — a bookmark, or a question they skipped — the correct
 * option leads alone.
 */
export function splitExplanationRows(rows: ExplanationRow[]) {
  const primary = rows.filter((r) => r.chosen || r.correct)
  const lead = primary.length > 0 ? primary : rows.filter((r) => r.correct)
  const leadKeys = new Set(lead.map((r) => r.key))
  return { lead, rest: rows.filter((r) => !leadKeys.has(r.key)) }
}
