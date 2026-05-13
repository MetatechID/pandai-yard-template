/** @type {import('next').NextConfig} */
const config = {
  // We do not use the experimental compiler. Stable wins. (Tried in 2024-Q2; reverted.)
  reactStrictMode: true,

  // In dev, proxy /api to backend-modern. In prod, nginx handles this.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8002/api/:path*',
      },
    ];
  },

  // ISR cache lives on each node; we pre-warm with the top-200-yesterday cron.
  // Don't bump this without checking the cache rewarm cron.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  // Image optimisation off — our images come from a CDN that already optimises.
  images: {
    unoptimized: true,
  },

  // i18n — disabled because we render bilingual strings inline.
  // (NextJS i18n is overkill for our two-locale + always-render-both pattern.)
};

export default config;
