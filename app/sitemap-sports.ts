import { MetadataRoute } from 'next'

// Sports content sitemap - updates frequently (hourly during season)
export default function sitemapSports(): MetadataRoute.Sitemap {
  const baseUrl = 'https://thebettinginsider.com'
  const sports = ['nfl', 'nba', 'cfb', 'nhl']
  
  // Main sports aggregator pages
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/sports`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/picks`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/ai-scripts`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/public-betting`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ]
  
  // Individual sport pages - these are category hubs that rank well
  const sportPages: MetadataRoute.Sitemap = sports.flatMap(sport => [
    {
      url: `${baseUrl}/sports/${sport}/games`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/${sport}/picks`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/${sport}/props`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/${sport}/ai-scripts`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sports/${sport}/public-betting`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ])
  
  return [...mainPages, ...sportPages]
}

