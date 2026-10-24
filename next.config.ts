import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fonts read at runtime by lib/og/render.tsx for share images.
  outputFileTracingIncludes: {
    "/**": ["./assets/og/**"],
  },

  // PGlite (DATABASE_URL=pglite:...) is a devDependency that finds its own wasm
  // files on disk, so it must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],

  images: {
    // Content images live in Vercel Blob (lib/storage), one public host per store.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
  },

  // The console uploads pictures through a Server Action (4 MB cap in
  // lib/admin/content/upload-limit.ts; Vercel itself refuses bodies over 4.5 MB).
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
        // The staff console is never for a crawler or a shared cache. robots.txt
        // and the page metadata say the same; this covers non-HTML responses too.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        // Tracking pages handle a private link; never send any part of the URL onwards. The pages that
        // post a form narrow this to same-origin in their metadata: a no-referrer document sends
        // `Origin: null` with a form, which Server Actions reject.
        source: "/:locale/lost-and-found/track/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
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
