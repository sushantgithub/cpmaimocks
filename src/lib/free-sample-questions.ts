import { prisma } from '@/lib/db'
import { FREE_SAMPLE_TAG } from '@/lib/free-sample'

const MAX_FREE_SAMPLES = 30

export async function getFreeSampleQuestions() {
  return prisma.question.findMany({
    where: {
      tags: { has: FREE_SAMPLE_TAG },
      status: 'PUBLISHED',
      isTest: false,
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    take: MAX_FREE_SAMPLES,
    select: {
      id: true,
      text: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionE: true,
      optionF: true,
      correctAnswer: true,
      explanation: true,
      explanationA: true,
      explanationB: true,
      explanationC: true,
      explanationD: true,
      explanationE: true,
      explanationF: true,
      category: { select: { name: true } },
    },
  })
}

export type FreeSampleQuestion = Awaited<ReturnType<typeof getFreeSampleQuestions>>[number]
