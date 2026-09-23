import { prisma } from '@/lib/db'
import { ImportBatchesTable } from '@/components/admin/import-batches-table'

export default async function ImportBatchesPage() {
  const batches = await prisma.questionImportBatch.findMany({
    include: { certification: { select: { name: true } }, _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Import History</h1><p className="text-sm text-gray-500">Manage questions by the CSV import that created them. Used questions are protected from deletion.</p></div>
    <ImportBatchesTable batches={batches} />
  </div>
}
