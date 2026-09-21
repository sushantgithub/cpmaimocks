import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://certmocks.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/faq', '/about', '/contact', '/legal/'],
        disallow: ['/dashboard/', '/admin/', '/exams/', '/practice/', '/quizzes/', '/results/', '/bookmarks/', '/profile/', '/subscription/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
