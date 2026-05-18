/** @type {import('next').NextConfig} */

// GitHub Pages export mode. The deploy-pages workflow sets:
//   NEXT_PUBLIC_STATIC_EXPORT=1   → app code serves bundled demo data
//   PAGES_BASE_PATH=/<repo-name>  → assets resolve under github.io/<repo>
// Normal dev / SSR builds set neither and behave exactly as before.
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const BASE_PATH = process.env.PAGES_BASE_PATH || '';

const base = {
  // We do not use the experimental compiler. Stable wins. (Tried in 2024-Q2; reverted.)
  reactStrictMode: true,

  // Image optimisation off — our images come from a CDN that already optimises.
  images: {
    unoptimized: true,
  },

  // i18n — disabled because we render bilingual strings inline.
  // (NextJS i18n is overkill for our two-locale + always-render-both pattern.)
};

const config = STATIC_EXPORT
  ? {
      ...base,
      // Fully static HTML/CSS/JS — hostable on GitHub Pages, no server.
      output: 'export',
      basePath: BASE_PATH,
      assetPrefix: BASE_PATH || undefined,
      // Pages serves /path/ → /path/index.html.
      trailingSlash: true,
      // rewrites/ISR are not supported with output:'export' — omitted here.
    }
  : {
      ...base,

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
    };

export default config;
