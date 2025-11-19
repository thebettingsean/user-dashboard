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
      {
        source: '/sitemap-games-nfl.xml',
        destination: '/api/sitemap-games-nfl',
      },
      {
        source: '/sitemap-games-nba.xml',
        destination: '/api/sitemap-games-nba',
      },
      {
        source: '/sitemap-games-college-football.xml',
        destination: '/api/sitemap-games-college-football',
      },
      {
        source: '/sitemap-games-nhl.xml',
        destination: '/api/sitemap-games-nhl',
      },
    ]
  },
}

export default nextConfig;