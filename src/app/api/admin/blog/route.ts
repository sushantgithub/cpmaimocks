import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdminSession } from '@/lib/require-auth'

export async function GET() {
  await requireAdminSession()
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      publishedAt: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  await requireAdminSession()
  const body = await req.json()

  const { title, slug, excerpt, content, tags, seoTitle, seoDescription, isPublished } = body

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'Title, slug, and content are required' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
      { status: 400 },
    )
  }

  // Check slug uniqueness
  const existing = await prisma.blogPost.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 400 })
  }

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      tags: Array.isArray(tags) ? tags : [],
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      isPublished: Boolean(isPublished),
      publishedAt: isPublished ? new Date() : null,
      author: 'CertMocks',
    },
  })

  return NextResponse.json(post, { status: 201 })
}
