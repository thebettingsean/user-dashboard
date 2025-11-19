import { MetadataRoute } from 'next'

// Static pages sitemap - only includes pages with meaningful SEO value
export default function sitemapPages(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thebettinginsider.com'
  
  return [
    // Homepage - highest priority
    {
      url: baseUrl,
      lastModified: new Date('2025-11-15'),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    
    // High-value conversion pages
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date('2025-11-10'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    
    // Category hub pages - these rank extremely well
    {
      url: `${baseUrl}/analyst-picks`,
      lastModified: new Date('2025-11-15'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/analyst-picks/about`,
      lastModified: new Date('2025-10-01'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/betting-guide`,
      lastModified: new Date('2025-11-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/fantasy`,
      lastModified: new Date('2025-11-15'),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    
    // Educational/About pages
    {
      url: `${baseUrl}/company`,
      lastModified: new Date('2025-09-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date('2025-09-01'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date('2025-10-15'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/betting/about`,
      lastModified: new Date('2025-10-01'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    
    // Legal pages - lowest priority
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date('2025-08-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date('2025-08-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date('2025-08-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}

