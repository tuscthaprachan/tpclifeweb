import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fonts read at runtime by lib/og/render.tsx for share images.
  outputFileTracingIncludes: {
    "/**": ["./assets/og/**"],
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
    formats: ["image/avif", "image/webp"],
  },

  typescript: {
    // A type error is a build failure. There is no "ship it anyway" here.
    ignoreBuildErrors: false,
  },

  // Next 16 no longer runs ESLint as part of `next build`. Linting is a
  // separate gate, run by `npm run check` and in CI.

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No camera, microphone or location. The site never needs them, and
          // saying so explicitly is cheaper than being asked why it might.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/((?!studio(?:/|$)).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        // The sanity.io dashboard shows the Studio in an iframe, so /studio
        // allows that one origin instead of sending X-Frame-Options.
        source: "/studio/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self' https://www.sanity.io" }],
      },
      {
        // The staff console is never for a crawler or a shared cache. robots.txt
        // and the page metadata say the same; this covers non-HTML responses too.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        // The search index is regenerated on revalidation, so it may be cached
        // hard at the edge but must revalidate quickly when content changes.
        source: "/api/search-index/:locale",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
