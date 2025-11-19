import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Rewrite sitemap URLs to API routes
  async rewrites() {
    return [
      {
        source: '/sitemap-pages.xml',
        destination: '/api/sitemap-pages',
      },
      {
        source: '/sitemap-sports.xml',
        destination: '/api/sitemap-sports',
      },
      {
        source: '/sitemap-tools.xml',
        destination: '/api/sitemap-tools',
      },
    ]
  },
}

export default nextConfig;