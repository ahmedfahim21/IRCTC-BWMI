import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * Defaults to .next, which is what Vercel and every other host expects.
   * Overridable so a build can be pointed elsewhere when one is already
   * running from .next — `pnpm build:isolated` and the Playwright config both
   * do that, because building over a live dev server silently 404s its client
   * chunks and leaves the page unhydrated.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { optimizePackageImports: ["lucide-react"] },
  /*
   * Destination photography is hotlinked rather than copied into the repo, and
   * served through Next's optimiser so it arrives as AVIF/WebP at the size it is
   * actually drawn. The originals are 31-180 KB JPEGs; this is the difference
   * between a premium-looking page and one that punishes a slow connection.
   */
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "www.holidify.com" },
      { protocol: "https", hostname: "static.toiimg.com" },
      { protocol: "https", hostname: "hblimg.mmtcdn.com" },
      { protocol: "https", hostname: "www.flamingotravels.co.in" },
      { protocol: "https", hostname: "media-cdn.tripadvisor.com" },
    ],
  },
};

export default nextConfig;
