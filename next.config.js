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
      // Driver adapters (@prisma/adapter-pg) mean the native query-engine
      // binary is never loaded at runtime, but Next's file tracer still
      // picks it up via a conditional require() in the generated client.
      // Each one is ~16MB, duplicated into every one of our ~60 route
      // functions, so excluding it is the main lever on Functions Storage.
      '*': [
        'node_modules/.prisma/client/libquery_engine-*',
        'node_modules/@prisma/engines/**',
        'node_modules/@prisma/engines-version/**',
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
