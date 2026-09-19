import { normalizeAnswer } from '@/lib/answers'

export type QuestionHistoryState = 'missed' | 'unseen' | 'correct'

export function questionHistoryState(
  latest: Map<string, boolean | null>,
  questionId: string,
): QuestionHistoryState {
  if (!latest.has(questionId)) return 'unseen'
  return latest.get(questionId) === true ? 'correct' : 'missed'
}

export function answerForFinalScoring(args: {
  showExplanations: boolean
  storedAnswer: string | null | undefined
  storedIsCorrect: boolean | null
  browserAnswer: string | null | undefined
  expired: boolean
}): string | null {
  const {
    showExplanations,
    storedAnswer,
    storedIsCorrect,
    browserAnswer,
    expired,
  } = args

  // In immediate-feedback mocks, Check Answer is the commit boundary.
  // Draft/autosaved selections have isCorrect=null and must remain unanswered.
  if (showExplanations) {
    return storedIsCorrect !== null
      ? (normalizeAnswer(storedAnswer) || null)
      : null
  }

  // Traditional exams keep the previous behavior: on expiry the persisted
  // server answer wins; otherwise the browser payload may contain the latest
  // selection and falls back to autosaved state.
  const raw = expired ? storedAnswer : (browserAnswer ?? storedAnswer)
  return normalizeAnswer(raw) || null
}

export function nextReviewIndex(current: number, pending: number[]): number | null {
  // Review is a forward-only pass through the questions that were unfinished
  // when review started. Do not wrap to earlier questions: once the last
  // pending question is completed, review should finish.
  return pending.find((index) => index > current) ?? null
}
