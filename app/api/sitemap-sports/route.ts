import { NextResponse } from 'next/server'

// Sports content sitemap - updates frequently (hourly during season)
export async function GET() {
  const baseUrl = 'https://thebettinginsider.com'
  const sports = ['nfl', 'nba', 'college-football', 'nhl'] // SEO-friendly URL slugs
  const today = new Date().toISOString().split('T')[0]
  
  const pages = []
  
  // Main sports aggregator pages
  pages.push(
    { url: `${baseUrl}/sports`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
    { url: `${baseUrl}/picks`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
    { url: `${baseUrl}/sports/ai-scripts`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
    { url: `${baseUrl}/sports/public-betting`, lastmod: today, changefreq: 'hourly', priority: '0.9' }
  )
  
  // Individual sport pages - category hubs
  sports.forEach(sport => {
    pages.push(
      { url: `${baseUrl}/sports/${sport}/games`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
      { url: `${baseUrl}/sports/${sport}/picks`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
      { url: `${baseUrl}/sports/${sport}/props`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
      { url: `${baseUrl}/sports/${sport}/ai-scripts`, lastmod: today, changefreq: 'hourly', priority: '0.9' },
      { url: `${baseUrl}/sports/${sport}/public-betting`, lastmod: today, changefreq: 'hourly', priority: '0.9' }
    )
  })

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
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate', // 1 hour cache (hourly updates)
    },
  })
}

