import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /*
   * Builds write to their own directory so `next build` never clobbers the
   * .next a running dev server is serving from — which silently 404s the
   * client chunks and leaves the page unhydrated.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { optimizePackageImports: ["lucide-react"] },
};

export default nextConfig;
