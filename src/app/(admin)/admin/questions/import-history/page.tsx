import { prisma } from '@/lib/db'
import { ImportBatchesTable } from '@/components/admin/import-batches-table'

export default async function ImportBatchesPage() {
  const batches = await prisma.questionImportBatch.findMany({
    include: {
      certification: { select: { name: true } },
      questions: { select: { category: { select: { name: true } }, tags: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = batches.map((batch) => {
    const domains = Array.from(new Set(batch.questions.map((q) => q.category?.name).filter((name): name is string => Boolean(name))))
    const quizNumbers = batch.contentType === 'QUIZ'
      ? Array.from(new Set(batch.questions.flatMap((q) => q.tags).map((tag) => tag.match(/-(\\d+)$/)?.[1]).filter((n): n is string => Boolean(n)).map(Number))).sort((a, b) => a - b)
      : []
    return { ...batch, questions: undefined, domains, quizNumbers }
  })

  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Import History</h1><p className="text-sm text-gray-500">Identify imports by original filename, domain and Quiz range before deleting. Used questions are protected from deletion.</p></div>
    <ImportBatchesTable batches={rows} />
  </div>
}
