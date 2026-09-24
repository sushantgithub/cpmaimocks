import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { title: true, seoTitle: true, seoDescription: true, excerpt: true },
    })
    if (!post) return {}
    return {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      alternates: { canonical: `/blog/${slug}` },
      openGraph: {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || undefined,
        type: 'article',
      },
    }
  } catch {
    return {}
  }
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true },
    })
    return posts.map((p) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params

  let post
  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
    })
  } catch {
    notFound()
  }

  if (!post || !post.isPublished) notFound()

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      {/* JSON-LD for article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.seoTitle || post.title,
            description: post.seoDescription || post.excerpt || '',
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            author: {
              '@type': 'Organization',
              name: 'CertMocks',
            },
            publisher: {
              '@type': 'Organization',
              name: 'CertMocks',
            },
          }),
        }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {post.publishedAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {post.author && <span>by {post.author}</span>}
          </div>
          {post.tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </header>

        {/* Blog content — stored as HTML in the database */}
        <div
          className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* CTA */}
      <div className="mt-12 rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
        <h3 className="font-bold text-lg mb-2">Ready to practise?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start with free CPMAI practice questions — no credit card required.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Start Free Today
        </Link>
      </div>
    </div>
  )
}
