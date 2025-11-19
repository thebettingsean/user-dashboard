import { MetadataRoute } from 'next'

// Main sitemap index that points to sub-sitemaps (via API routes)
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thebettinginsider.com'
  
  return [
    {
      url: `${baseUrl}/sitemap-pages.xml`,
      lastModified: new Date('2025-11-10'),
    },
    {
      url: `${baseUrl}/sitemap-sports.xml`,
      lastModified: new Date(), // Updates hourly
    },
    {
      url: `${baseUrl}/sitemap-tools.xml`,
      lastModified: new Date('2025-11-01'),
    },
    // Dynamic game sitemaps (updated hourly from database)
    {
      url: `${baseUrl}/sitemap-games-nfl.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sitemap-games-nba.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sitemap-games-cfb.xml`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/sitemap-games-nhl.xml`,
      lastModified: new Date(),
    },
  ]
}
