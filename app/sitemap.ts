import { MetadataRoute } from 'next'

// Main sitemap index that points to sub-sitemaps
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thebettinginsider.com'
  
  return [
    {
      url: `${baseUrl}/sitemap-pages.xml`,
      lastModified: new Date('2025-11-10'), // Update when pages structure changes
    },
    {
      url: `${baseUrl}/sitemap-sports.xml`,
      lastModified: new Date(), // Updates daily as sports content changes
    },
    {
      url: `${baseUrl}/sitemap-tools.xml`,
      lastModified: new Date('2025-11-01'), // Update when tools are added/changed
    },
  ]
}
