import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // EXPLICITLY ALLOW assets Google needs to render pages
        allow: [
          '/',
          '/assets/',
          '/static/',
          '/images/',
          '/fonts/',
          '/_next/static/',
          '/_next/image/',
          '/favicon.ico',
          '/og-image.png',
        ],
        // Block private, internal, and non-indexable routes
        disallow: [
          // User dashboards and private areas
          '/dashboard/',
          '/manage-subscription/',
          '/betting/dashboard/',
          
          // API endpoints and internal routes
          '/api/',
          '/webhooks/',
          
          // Admin and internal tools
          '/admin/',
          '/internal/',
          '/studio/',
          '/submit-analyst-picks/',
          
          // Development and staging routes
          '/new/', // Excluded per user request
          
          // Checkout and transactional pages
          '/checkout/',
          '/success/',
          '/upgrade/',
          '/webhook-debug/',
          
          // Query parameters and filters (prevent crawl traps)
          '/*?*', // Block all query parameters
          '/*sort=*',
          '/*filter=*',
          '/*page=*',
          '/*search=*',
        ],
      },
      // Explicitly allow Google's specialized bots
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      },
    ],
    sitemap: [
      'https://thebettinginsider.com/sitemap.xml',
      'https://thebettinginsider.com/sitemap-pages.xml',
      'https://thebettinginsider.com/sitemap-sports.xml',
      'https://thebettinginsider.com/sitemap-tools.xml',
      'https://thebettinginsider.com/sitemap-games-nfl.xml',
      'https://thebettinginsider.com/sitemap-games-nba.xml',
      'https://thebettinginsider.com/sitemap-games-college-football.xml',
      'https://thebettinginsider.com/sitemap-games-nhl.xml',
    ],
  }
}
