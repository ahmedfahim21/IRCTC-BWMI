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
};

export default nextConfig;
