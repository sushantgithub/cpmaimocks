'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Upload, AlertCircle, CheckCircle2, X, FileText } from 'lucide-react'

const REQUIRED_COLS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation']
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'easy', 'medium', 'hard']
const VALID_ANSWERS = ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']

interface RowData {
  question_id?: string; question: string; option_a: string; option_b: string
  option_c: string; option_d: string; correct_answer: string; explanation: string
  domain?: string; topic?: string; difficulty?: string; source?: string
}

interface ValidationResult {
  row: number; errors: string[]
}

interface Preview { valid: RowData[]; errors: ValidationResult[]; total: number }

function validateRow(row: RowData, index: number): string[] {
  const errors: string[] = []
  if (!row.question?.trim()) errors.push('Missing question text')
  if (!row.option_a?.trim()) errors.push('Missing option A')
  if (!row.option_b?.trim()) errors.push('Missing option B')
  if (!row.option_c?.trim()) errors.push('Missing option C')
  if (!row.option_d?.trim()) errors.push('Missing option D')
  if (!row.correct_answer?.trim()) errors.push('Missing correct answer')
  else if (!VALID_ANSWERS.includes(row.correct_answer.trim())) errors.push('Correct answer must be A, B, C, or D')
  if (!row.explanation?.trim()) errors.push('Missing explanation')
  if (row.difficulty && !VALID_DIFFICULTIES.includes(row.difficulty.trim())) errors.push('Difficulty must be EASY, MEDIUM, or HARD')
  return errors
}

export function CsvImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function processFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as RowData[]
        const headers = Object.keys(rows[0] ?? {})
        const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c))
        if (missingCols.length > 0) {
          toast({ title: `Missing required columns: ${missingCols.join(', ')}`, variant: 'destructive' })
          return
        }

        const valid: RowData[] = []
        const errors: ValidationResult[] = []

        rows.forEach((row, i) => {
          const rowErrors = validateRow(row, i + 2)
          if (rowErrors.length > 0) {
            errors.push({ row: i + 2, errors: rowErrors })
          } else {
            valid.push(row)
          }
        })

        setPreview({ valid, errors, total: rows.length })
      },
      error: () => toast({ title: 'Failed to parse file. Check format.', variant: 'destructive' }),
    })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  async function importQuestions() {
    if (!preview?.valid.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: preview.valid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${data.imported} questions imported successfully!`, variant: 'success' })
      setImported(true)
      setPreview(null)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Import failed')
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template download */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">CSV Template</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your CSV must have these column headers (case sensitive):
          </p>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
            question_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,domain,topic,difficulty,source
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              { col: 'question_id', req: false, note: 'Auto-generated if blank' },
              { col: 'question', req: true, note: 'Full question text' },
              { col: 'option_a', req: true, note: 'Option A text' },
              { col: 'option_b', req: true, note: 'Option B text' },
              { col: 'option_c', req: true, note: 'Option C text' },
              { col: 'option_d', req: true, note: 'Option D text' },
              { col: 'correct_answer', req: true, note: 'A, B, C, or D' },
              { col: 'explanation', req: true, note: 'Detailed explanation' },
              { col: 'domain', req: false, note: 'CPMAI domain name' },
              { col: 'topic', req: false, note: 'Topic within domain' },
              { col: 'difficulty', req: false, note: 'EASY, MEDIUM, or HARD' },
              { col: 'source', req: false, note: 'Optional reference' },
            ].map((c) => (
              <div key={c.col} className="flex items-start gap-1">
                <span className={`font-mono ${c.req ? 'text-red-600' : 'text-gray-500'}`}>{c.col}</span>
                {c.req && <span className="text-red-500">*</span>}
                <span className="text-gray-400">— {c.note}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      {!preview && !imported && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">Drop your CSV file here</p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <FileText className="h-4 w-4" />
            Choose CSV File
            <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          </label>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview ({preview.total} rows)</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" />
              <span><strong>{preview.valid.length}</strong> valid questions</span>
            </div>
            {preview.errors.length > 0 && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4" />
                <span><strong>{preview.errors.length}</strong> rows with errors</span>
              </div>
            )}
          </div>

          {preview.errors.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-red-700 mb-3 text-sm">Rows with errors (will be skipped):</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {preview.errors.map((e) => (
                    <div key={e.row} className="text-xs text-red-600">
                      <span className="font-mono font-semibold">Row {e.row}:</span> {e.errors.join(' • ')}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {preview.valid.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Question</th>
                        <th className="text-left px-3 py-2 font-medium">Answer</th>
                        <th className="text-left px-3 py-2 font-medium">Domain</th>
                        <th className="text-left px-3 py-2 font-medium">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.valid.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 max-w-xs">
                            <p className="truncate">{row.question}</p>
                          </td>
                          <td className="px-3 py-2 font-semibold text-primary">{row.correct_answer.toUpperCase()}</td>
                          <td className="px-3 py-2 text-gray-500">{row.domain ?? '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {(row.difficulty ?? 'medium').toLowerCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.valid.length > 10 && (
                    <p className="text-xs text-muted-foreground px-3 py-2 text-center">
                      ...and {preview.valid.length - 10} more questions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={importQuestions} loading={importing} disabled={preview.valid.length === 0}>
              Import {preview.valid.length} Questions
            </Button>
          </div>
        </div>
      )}

      {imported && (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Import Complete!</h3>
          <p className="text-muted-foreground text-sm mb-4">Questions have been added to your question bank as drafts.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setImported(false)}>Import More</Button>
            <Button asChild><a href="/admin/questions">View Questions</a></Button>
          </div>
        </div>
      )}
    </div>
  )
}
