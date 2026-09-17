import { CsvImportClient } from '@/components/admin/csv-import-client'

export default function ImportPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import Questions</h1>
        <p className="text-sm text-gray-500 mt-1">Upload a CSV or Excel file to import questions into the question bank.</p>
      </div>
      <CsvImportClient />
    </div>
  )
}
