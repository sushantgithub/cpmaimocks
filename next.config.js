/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
    outputFileTracingExcludes: {
      // NOTE: do NOT exclude node_modules/.prisma/client/libquery_engine-*
      // or @prisma/engines/**. Even with driver adapters configured,
      // Prisma 5.22's client still does an internal "locate the query
      // engine" step on every query and hard-fails if the binary isn't on
      // disk (confirmed in production: "could not locate the Query Engine
      // for runtime rhel-openssl-3.0.x"). The prisma CLI package itself
      // (devDependency, never imported at runtime) is still safe to drop.
      '*': [
        'node_modules/prisma/**',
        'node_modules/**/*.md',
        'node_modules/**/README*',
        'node_modules/**/CHANGELOG*',
        'node_modules/**/*.map',
        'node_modules/typescript/**',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
