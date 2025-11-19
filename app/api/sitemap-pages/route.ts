import { NextResponse } from 'next/server'

// Static pages sitemap - only includes pages with meaningful SEO value
export async function GET() {
  const baseUrl = 'https://thebettinginsider.com'
  
  const pages = [
    // Homepage - highest priority
    { url: baseUrl, lastmod: '2025-11-15', changefreq: 'daily', priority: '1.0' },
    
    // High-value conversion pages
    { url: `${baseUrl}/pricing`, lastmod: '2025-11-10', changefreq: 'weekly', priority: '0.9' },
    
    // Category hub pages
    { url: `${baseUrl}/analyst-picks`, lastmod: '2025-11-15', changefreq: 'daily', priority: '0.9' },
    { url: `${baseUrl}/analyst-picks/about`, lastmod: '2025-10-01', changefreq: 'monthly', priority: '0.6' },
    { url: `${baseUrl}/betting-guide`, lastmod: '2025-11-01', changefreq: 'monthly', priority: '0.8' },
    { url: `${baseUrl}/fantasy`, lastmod: '2025-11-15', changefreq: 'daily', priority: '0.8' },
    
    // Educational/About pages
    { url: `${baseUrl}/company`, lastmod: '2025-09-01', changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/contact`, lastmod: '2025-09-01', changefreq: 'monthly', priority: '0.5' },
    { url: `${baseUrl}/faq`, lastmod: '2025-10-15', changefreq: 'monthly', priority: '0.6' },
    { url: `${baseUrl}/betting/about`, lastmod: '2025-10-01', changefreq: 'monthly', priority: '0.6' },
    
    // Legal pages
    { url: `${baseUrl}/terms-of-service`, lastmod: '2025-08-01', changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/privacy-policy`, lastmod: '2025-08-01', changefreq: 'yearly', priority: '0.3' },
    { url: `${baseUrl}/refund-policy`, lastmod: '2025-08-01', changefreq: 'yearly', priority: '0.3' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  })
}

