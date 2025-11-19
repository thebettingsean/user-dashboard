/**
 * Structured Data (JSON-LD) Generators
 * Implements: SportsEvent, Breadcrumb, Article, Organization schemas
 * 
 * These unlock Google rich snippets and better search visibility!
 */

const SITE_URL = 'https://thebettinginsider.com'
const SITE_NAME = 'The Betting Insider'

/**
 * SportsEvent Schema - THE SECRET WEAPON for game pages!
 * 
 * This tells Google:
 * - Event name, teams, date, location
 * - Betting odds (spread, moneyline, total)
 * - Subpages (picks, public betting, script)
 * 
 * Unlocks rich snippets like "Game starts at..." and better rankings!
 */
export function generateSportsEventSchema(game: {
  sport: string
  awayTeam: string
  homeTeam: string
  gameDate: string
  venue?: string
  spread?: { home: number; away: number }
  moneyline?: { home: number; away: number }
  total?: number
  gameId: string
}) {
  const date = new Date(game.gameDate)
  const slug = `${game.awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${game.homeTeam.toLowerCase().replace(/\s+/g, '-')}-${date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()}-${date.getDate()}`
  const gameUrl = `${SITE_URL}/sports/${game.sport.toLowerCase()}/games/${slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.awayTeam} at ${game.homeTeam}`,
    description: `${game.sport.toUpperCase()} game: ${game.awayTeam} vs ${game.homeTeam}`,
    startDate: game.gameDate,
    location: game.venue ? {
      '@type': 'Place',
      name: game.venue
    } : undefined,
    awayTeam: {
      '@type': 'SportsTeam',
      name: game.awayTeam,
      sport: game.sport.toUpperCase()
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: game.homeTeam,
      sport: game.sport.toUpperCase()
    },
    competitor: [
      {
        '@type': 'SportsTeam',
        name: game.awayTeam
      },
      {
        '@type': 'SportsTeam',
        name: game.homeTeam
      }
    ],
    sport: game.sport.toUpperCase(),
    url: gameUrl,
    // Additional custom properties for betting data
    ...(game.spread && {
      'bettingSpread': {
        '@type': 'PropertyValue',
        name: 'Point Spread',
        value: `${game.homeTeam} ${game.spread.home > 0 ? '+' : ''}${game.spread.home}`
      }
    }),
    ...(game.moneyline && {
      'bettingMoneyline': {
        '@type': 'PropertyValue',
        name: 'Moneyline',
        value: `${game.homeTeam} ${game.moneyline.home > 0 ? '+' : ''}${game.moneyline.home}`
      }
    }),
    ...(game.total && {
      'bettingTotal': {
        '@type': 'PropertyValue',
        name: 'Over/Under',
        value: game.total.toString()
      }
    }),
    // Subpages for better Google understanding
    subjectOf: [
      {
        '@type': 'WebPage',
        name: 'Game Picks & Predictions',
        url: `${gameUrl}/picks`
      },
      {
        '@type': 'WebPage',
        name: 'Public Betting Data',
        url: `${gameUrl}/public-betting`
      },
      {
        '@type': 'Article',
        name: 'AI Game Script & Analysis',
        url: `${gameUrl}/script`
      },
      {
        '@type': 'Dataset',
        name: 'Complete Game Data',
        url: `${gameUrl}/data`
      }
    ]
  }
}

/**
 * Article Schema - For AI scripts and blog content
 * Boosts ranking for prediction/analysis pages
 */
export function generateArticleSchema(article: {
  title: string
  description: string
  publishedDate: string
  modifiedDate?: string
  url: string
  imageUrl?: string
  author?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedDate,
    dateModified: article.modifiedDate || article.publishedDate,
    url: article.url,
    image: article.imageUrl || `${SITE_URL}/og-image.png`,
    author: {
      '@type': 'Organization',
      name: article.author || SITE_NAME,
      url: SITE_URL
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url
    }
  }
}

/**
 * Breadcrumb Schema - Helps Google understand site structure
 * Essential for deep pages (game pages, tools, etc.)
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : `${SITE_URL}${crumb.url}`
    }))
  }
}

/**
 * Organization Schema - Site-wide identity
 * Should be on homepage and key pages
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Premium sports betting analytics, AI-powered picks, and real-time betting data for NFL, NBA, CFB, and NHL.',
    sameAs: [
      'https://twitter.com/BettingInsider',
      // Add other social profiles
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: `${SITE_URL}/contact`
    }
  }
}

/**
 * HowTo Schema - For betting tools and educational pages
 * Great for "how to calculate..." queries
 */
export function generateHowToSchema(howTo: {
  name: string
  description: string
  steps: Array<{ name: string; text: string }>
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    url: howTo.url,
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text
    }))
  }
}

/**
 * FAQ Schema - For FAQ pages
 * Creates expandable rich snippets in Google
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

/**
 * Website SearchAction Schema - Enables Google site search
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

/**
 * Helper: Render JSON-LD script tag
 * Use this in your page components
 */
export function renderStructuredData(schema: any) {
  return {
    __html: JSON.stringify(schema)
  }
}

