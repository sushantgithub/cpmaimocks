export interface PracticeQuestionHistoryRow {
  questionId: string
  isCorrect: boolean | null
}

function shuffleWithRandom<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Random Practice should teach new material before repeating old material.
 *
 * A question counts as seen as soon as it has been included in a Practice
 * attempt, even if the learner never submitted an answer. This prevents a
 * started/abandoned session from serving the same questions again while unseen
 * questions remain and is especially important for the finite free allowance.
 *
 * Within seen questions, the latest checked verdict determines whether the
 * question is currently missed or correct. Seen-but-never-checked questions
 * are treated like missed questions and are reviewed before correct ones.
 */
export function selectRandomPracticeQuestionIds(
  poolIds: string[],
  history: PracticeQuestionHistoryRow[],
  questionCount: number,
  random: () => number = Math.random,
): string[] {
  const limit = Number.isInteger(questionCount) && questionCount > 0
    ? questionCount
    : 0
  if (limit === 0) return []

  const uniquePool = Array.from(new Set(poolIds))
  if (uniquePool.length === 0) return []

  const seen = new Set<string>()
  const latestChecked = new Map<string, boolean>()

  for (const row of history) {
    seen.add(row.questionId)
    if (row.isCorrect !== null) {
      latestChecked.set(row.questionId, row.isCorrect)
    }
  }

  const unseen: string[] = []
  const missed: string[] = []
  const correct: string[] = []

  for (const id of uniquePool) {
    if (!seen.has(id)) {
      unseen.push(id)
    } else if (latestChecked.get(id) === true) {
      correct.push(id)
    } else {
      missed.push(id)
    }
  }

  return [
    ...shuffleWithRandom(unseen, random),
    ...shuffleWithRandom(missed, random),
    ...shuffleWithRandom(correct, random),
  ].slice(0, limit)
}
