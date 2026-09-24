import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, ctx: Ctx) {
  await requireAdminSession()
  const { id } = await ctx.params
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PUT(req: Request, ctx: Ctx) {
  await requireAdminSession()
  const { id } = await ctx.params
  const body = await req.json()

  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, slug, excerpt, content, tags, seoTitle, seoDescription, isPublished } = body

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'Title, slug, and content are required' }, { status: 400 })
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
      { status: 400 },
    )
  }

  // Check slug uniqueness (excluding this post)
  const slugConflict = await prisma.blogPost.findFirst({
    where: { slug, id: { not: id } },
  })
  if (slugConflict) {
    return NextResponse.json({ error: 'Another post already uses this slug' }, { status: 400 })
  }

  const wasPublished = existing.isPublished
  const nowPublished = Boolean(isPublished)

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      tags: Array.isArray(tags) ? tags : [],
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      isPublished: nowPublished,
      // Set publishedAt on first publish, keep it on updates
      publishedAt: nowPublished && !wasPublished ? new Date() : existing.publishedAt,
    },
  })

  return NextResponse.json(post)
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdminSession()
  const { id } = await ctx.params
  await prisma.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
