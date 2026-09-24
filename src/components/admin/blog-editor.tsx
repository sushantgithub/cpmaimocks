'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Save, Eye } from 'lucide-react'

interface BlogEditorProps {
  initialData?: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export function BlogEditor({ initialData, onSave, saving }: BlogEditorProps) {
  const [form, setForm] = useState({
    title: (initialData?.title as string) || '',
    slug: (initialData?.slug as string) || '',
    excerpt: (initialData?.excerpt as string) || '',
    content: (initialData?.content as string) || '',
    tags: ((initialData?.tags as string[]) || []).join(', '),
    seoTitle: (initialData?.seoTitle as string) || '',
    seoDescription: (initialData?.seoDescription as string) || '',
    isPublished: Boolean(initialData?.isPublished),
  })
  const [preview, setPreview] = useState(false)

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleTitleChange(title: string) {
    setField('title', title)
    // Auto-generate slug only for new posts (no initial data)
    if (!initialData) {
      setField('slug', autoSlug(title))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave({
      ...form,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="CPMAI Exam: Complete Guide (2025)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              URL Slug *
              <span className="text-muted-foreground font-normal ml-1">
                /blog/{form.slug || '...'}
              </span>
            </label>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              placeholder="cpmai-exam-complete-guide"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.excerpt}
              onChange={(e) => setField('excerpt', e.target.value)}
              placeholder="Short summary shown on the blog listing page..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Content (HTML) *</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreview(!preview)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                {preview ? 'Edit' : 'Preview'}
              </Button>
            </div>
            {preview ? (
              <div
                className="prose prose-gray max-w-none border rounded-md p-4 min-h-[200px] text-sm"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            ) : (
              <textarea
                className={`${inputClass} font-mono text-xs`}
                rows={16}
                value={form.content}
                onChange={(e) => setField('content', e.target.value)}
                placeholder="<h2>What is CPMAI?</h2><p>The CPMAI certification...</p>"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
            </label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => setField('tags', e.target.value)}
              placeholder="CPMAI, Study Guide, Exam Tips"
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO fields */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold text-sm">SEO Settings</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              SEO Title
              <span className="text-muted-foreground font-normal ml-1">
                ({form.seoTitle.length}/60)
              </span>
            </label>
            <input
              className={inputClass}
              value={form.seoTitle}
              onChange={(e) => setField('seoTitle', e.target.value)}
              placeholder="Falls back to post title if empty"
              maxLength={70}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              SEO Description
              <span className="text-muted-foreground font-normal ml-1">
                ({form.seoDescription.length}/160)
              </span>
            </label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.seoDescription}
              onChange={(e) => setField('seoDescription', e.target.value)}
              placeholder="Falls back to excerpt if empty"
              maxLength={170}
            />
          </div>

          {/* Google preview */}
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-muted-foreground mb-2">Google Search Preview:</p>
            <div>
              <p className="text-blue-700 text-sm hover:underline cursor-pointer">
                {form.seoTitle || form.title || 'Post Title'} | CertMocks
              </p>
              <p className="text-green-700 text-xs">
                certmocks.com/blog/{form.slug || '...'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {form.seoDescription || form.excerpt || 'Post description will appear here...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publish controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setField('isPublished', e.target.checked)}
            className="rounded"
          />
          Publish immediately
        </label>

        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : initialData ? 'Update Post' : 'Create Post'}
        </Button>
      </div>
    </form>
  )
}
