import { NextResponse } from 'next/server'

// Tools and calculators sitemap - valuable SEO pages
export async function GET() {
  const baseUrl = 'https://thebettinginsider.com'
  
  const tools = [
    // Prop tools
    { url: `${baseUrl}/prop-parlay-tool`, lastmod: '2025-11-01', changefreq: 'weekly', priority: '0.8' },
    { url: `${baseUrl}/anytime-td`, lastmod: '2025-11-01', changefreq: 'daily', priority: '0.7' },
    
    // Calculators - evergreen content
    { url: `${baseUrl}/bankroll-builder`, lastmod: '2025-10-15', changefreq: 'monthly', priority: '0.7' },
    { url: `${baseUrl}/bankroll-calculator`, lastmod: '2025-10-15', changefreq: 'monthly', priority: '0.7' },
    { url: `${baseUrl}/parlay-calculator`, lastmod: '2025-10-15', changefreq: 'monthly', priority: '0.7' },
    { url: `${baseUrl}/roi-calculator`, lastmod: '2025-10-15', changefreq: 'monthly', priority: '0.7' },
    { url: `${baseUrl}/maximize-profit`, lastmod: '2025-10-01', changefreq: 'monthly', priority: '0.7' },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${tools.map(tool => `  <url>
    <loc>${tool.url}</loc>
    <lastmod>${tool.lastmod}</lastmod>
    <changefreq>${tool.changefreq}</changefreq>
    <priority>${tool.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate', // 24 hour cache
    },
  })
}

