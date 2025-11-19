import { MetadataRoute } from 'next'

// Tools and calculators sitemap - valuable SEO pages
export default function sitemapTools(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thebettinginsider.com'
  
  return [
    // Prop tools - high user engagement
    {
      url: `${baseUrl}/prop-parlay-tool`,
      lastModified: new Date('2025-11-01'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/anytime-td`,
      lastModified: new Date('2025-11-01'),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    
    // Calculators - evergreen content that ranks well
    {
      url: `${baseUrl}/bankroll-builder`,
      lastModified: new Date('2025-10-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/bankroll-calculator`,
      lastModified: new Date('2025-10-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/parlay-calculator`,
      lastModified: new Date('2025-10-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/roi-calculator`,
      lastModified: new Date('2025-10-15'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/maximize-profit`,
      lastModified: new Date('2025-10-01'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}

