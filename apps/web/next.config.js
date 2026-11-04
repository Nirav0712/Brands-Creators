/** @type {import('next').NextConfig} */
const rawApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const apiBase = rawApiUrl.replace(/\/api\/v1\/?$/, '');
const wsBase = apiBase.replace(/^http/, 'ws');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/onboarding/brand',
        destination: '/onboarding',
        permanent: true,
      },
      {
        source: '/onboarding/creator',
        destination: '/onboarding',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              `img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com http://localhost:4000 http://127.0.0.1:4000 ${apiBase}`,
              `connect-src 'self' http://localhost:4000 ws://localhost:4000 http://127.0.0.1:4000 ws://127.0.0.1:4000 ${apiBase} ${wsBase}`,
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
