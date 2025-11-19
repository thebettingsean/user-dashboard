import { Metadata } from 'next'

const SITE_NAME = 'The Betting Insider'
const SITE_URL = 'https://thebettinginsider.com'
const DEFAULT_DESCRIPTION = 'Expert NFL, NBA, CFB, and NHL betting picks with AI-powered analytics, real-time data, and insider insights. Join thousands of winning bettors.'

export interface MetadataParams {
  title: string
  description?: string
  keywords?: string[]
  canonical?: string
  noindex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  image?: string
}

/**
 * Generate dynamic metadata for any page
 * Includes: title, description, Open Graph, Twitter cards, canonical tags
 */
export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  canonical,
  noindex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  image = '/og-image.png'
}: MetadataParams): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined

  return {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type,
      images: [
        {
          url: image.startsWith('http') ? image : `${SITE_URL}${image}`,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      ...(type === 'article' && publishedTime ? {
        publishedTime,
        modifiedTime,
      } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image.startsWith('http') ? image : `${SITE_URL}${image}`],
      creator: '@BettingInsider'
    }
  }
}

/**
 * Generate metadata for game pages
 * Example: "Warriors vs Lakers - Odds, Picks & Public Betting (Nov 9)"
 */
export function generateGameMetadata(
  sport: string,
  awayTeam: string,
  homeTeam: string,
  gameDate: string,
  subPage?: 'picks' | 'public-betting' | 'script' | 'data'
): Metadata {
  const date = new Date(gameDate)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const dateStr = `${month} ${day}`

  const sportName = sport.toUpperCase()
  const matchup = `${awayTeam} vs ${homeTeam}`

  let title: string
  let description: string
  let keywords: string[]

  switch (subPage) {
    case 'picks':
      title = `${matchup} Picks & Predictions (${dateStr})`
      description = `Expert ${sportName} picks for ${matchup} on ${dateStr}. AI-powered predictions, betting trends, analyst picks, and real-time odds analysis.`
      keywords = [`${sportName} picks`, `${awayTeam} ${homeTeam} prediction`, 'betting picks', 'AI predictions']
      break
    
    case 'public-betting':
      title = `${matchup} Public Betting (${dateStr})`
      description = `Live public betting percentages for ${matchup} on ${dateStr}. Real-time money splits, sharp action, and reverse line movement data.`
      keywords = [`${sportName} public betting`, 'betting percentages', 'sharp money', `${awayTeam} ${homeTeam} betting`]
      break
    
    case 'script':
      title = `${matchup} AI Analysis & Script (${dateStr})`
      description = `AI-generated game script for ${matchup} on ${dateStr}. Deep dive into matchups, trends, player props, and betting angles with real-time data.`
      keywords = [`${sportName} AI analysis`, 'game script', `${awayTeam} ${homeTeam} preview`, 'betting analysis']
      break
    
    case 'data':
      title = `${matchup} Game Data & Stats (${dateStr})`
      description = `Complete game data for ${matchup} on ${dateStr}. Team stats, betting history, referee trends, H2H records, and advanced analytics.`
      keywords = [`${sportName} stats`, 'game data', `${awayTeam} ${homeTeam} stats`, 'betting data']
      break
    
    default:
      title = `${matchup} - Odds, Picks & Public Betting (${dateStr})`
      description = `${sportName} ${matchup} prediction & data for ${dateStr}. Odds, public betting, props, picks, trends & AI script. Live updated.`
      keywords = [`${sportName} ${awayTeam} ${homeTeam}`, 'odds', 'picks', 'public betting', 'predictions']
  }

  const slug = `${awayTeam.toLowerCase().replace(/\s+/g, '-')}-at-${homeTeam.toLowerCase().replace(/\s+/g, '-')}-${month.toLowerCase()}-${day}`
  const canonical = `/sports/${sport.toLowerCase()}/games/${slug}${subPage ? `/${subPage}` : ''}`

  return generateMetadata({
    title,
    description,
    keywords,
    canonical,
    type: subPage === 'script' ? 'article' : 'website',
    publishedTime: subPage === 'script' ? gameDate : undefined,
    modifiedTime: subPage === 'script' ? new Date().toISOString() : undefined
  })
}

/**
 * Generate metadata for sport hub pages
 */
export function generateSportHubMetadata(
  sport: string,
  subPage?: 'picks' | 'public-betting' | 'props' | 'ai-scripts' | 'games'
): Metadata {
  const sportName = sport.toUpperCase()

  let title: string
  let description: string
  let keywords: string[]

  switch (subPage) {
    case 'picks':
      title = `${sportName} Picks Today - Expert Predictions & Betting Trends`
      description = `Today's best ${sportName} picks with AI analysis, expert predictions, betting trends, and real-time odds. Updated daily.`
      keywords = [`${sportName} picks today`, 'betting picks', `${sportName} predictions`, 'expert picks']
      break
    
    case 'public-betting':
      title = `${sportName} Public Betting Today - Live Percentages & Money Splits`
      description = `Live ${sportName} public betting percentages, money percentages, sharp action, and reverse line movement. Updated every 5 minutes.`
      keywords = [`${sportName} public betting`, 'betting percentages', 'sharp money', 'RLM']
      break
    
    case 'props':
      title = `${sportName} Player Props Today - Best Bets & AI Models`
      description = `${sportName} player props with AI models, hit rates, trends, and expert picks. Find the best prop bets for today's games.`
      keywords = [`${sportName} player props`, 'prop bets', `${sportName} props today`, 'AI props']
      break
    
    case 'ai-scripts':
      title = `${sportName} AI Game Scripts - Data-Driven Analysis`
      description = `AI-generated game scripts for all ${sportName} games. Deep analysis, matchup breakdowns, and betting angles backed by data.`
      keywords = [`${sportName} AI analysis`, 'game scripts', `${sportName} betting analysis`, 'AI predictions']
      break
    
    case 'games':
      title = `${sportName} Games Today - Live Odds, Picks & Betting Data`
      description = `All ${sportName} games today with live odds, picks, public betting, props, and AI analysis. Your complete betting dashboard.`
      keywords = [`${sportName} games today`, 'live odds', `${sportName} schedule`, 'betting data']
      break
    
    default:
      title = `${sportName} Betting - Picks, Odds, Public Betting & AI Analysis`
      description = `Complete ${sportName} betting hub with picks, odds, public betting, props, AI scripts, and real-time data. Everything you need to win.`
      keywords = [`${sportName} betting`, `${sportName} picks`, `${sportName} odds`, 'sports betting']
  }

  const canonical = `/sports/${sport.toLowerCase()}${subPage ? `/${subPage}` : ''}`

  return generateMetadata({
    title,
    description,
    keywords,
    canonical
  })
}

/**
 * Generate metadata for betting tools
 */
export function generateToolMetadata(tool: string): Metadata {
  const toolMetadata: Record<string, { title: string; description: string; keywords: string[] }> = {
    'bankroll-calculator': {
      title: 'Bankroll Calculator - Free Sports Betting Tool',
      description: 'Free bankroll calculator for sports betting. Calculate optimal bet sizing, Kelly criterion, unit sizing, and bankroll management strategies.',
      keywords: ['bankroll calculator', 'betting calculator', 'Kelly criterion', 'unit sizing', 'bankroll management']
    },
    'parlay-calculator': {
      title: 'Parlay Calculator - Calculate Odds & Payouts',
      description: 'Free parlay calculator for sports betting. Calculate parlay odds, payouts, and profits for 2-15 leg parlays with American, decimal, or fractional odds.',
      keywords: ['parlay calculator', 'parlay odds', 'betting calculator', 'parlay payout']
    },
    'roi-calculator': {
      title: 'ROI Calculator - Track Your Betting Performance',
      description: 'Free ROI calculator for sports betting. Track your return on investment, profit margins, and betting performance over time.',
      keywords: ['ROI calculator', 'betting ROI', 'sports betting returns', 'profit calculator']
    },
    'prop-parlay-tool': {
      title: 'Prop Parlay Tool - Build Winning Prop Parlays',
      description: 'Free prop parlay tool with AI models, hit rates, and player prop trends. Build data-driven prop parlays with real-time odds.',
      keywords: ['prop parlay', 'player props', 'parlay builder', 'prop bets']
    },
    'bankroll-builder': {
      title: 'Bankroll Builder - Grow Your Betting Bankroll',
      description: 'Free bankroll builder tool. Simulate bankroll growth, unit sizing strategies, and long-term betting profitability.',
      keywords: ['bankroll builder', 'betting bankroll', 'bankroll growth', 'unit sizing']
    },
    'anytime-td': {
      title: 'NFL Anytime TD Scorer Predictions - AI Model',
      description: 'NFL anytime touchdown scorer predictions with AI models, historical hit rates, and player trends. Find the best TD bets.',
      keywords: ['anytime TD', 'touchdown scorer', 'NFL props', 'TD predictions']
    }
  }

  const metadata = toolMetadata[tool] || {
    title: 'Free Betting Tools',
    description: 'Free sports betting tools and calculators.',
    keywords: ['betting tools', 'free calculators']
  }

  return generateMetadata({
    ...metadata,
    canonical: `/${tool}`
  })
}

/**
 * Generate metadata for static pages
 */
export function generateStaticPageMetadata(page: string): Metadata {
  const pageMetadata: Record<string, { title: string; description: string; keywords: string[] }> = {
    'pricing': {
      title: 'Pricing - Premium Sports Betting Analytics',
      description: 'Premium sports betting analytics, AI-powered picks, and insider data. Choose the plan that fits your betting strategy.',
      keywords: ['betting subscription', 'sports betting tools', 'premium picks', 'betting analytics']
    },
    'analyst-picks': {
      title: 'Expert Analyst Picks - Verified Track Records',
      description: 'Expert sports betting picks from verified analysts with transparent track records. NFL, NBA, CFB, and NHL picks updated daily.',
      keywords: ['expert picks', 'analyst picks', 'sports betting experts', 'verified picks']
    },
    'betting-guide': {
      title: 'Sports Betting Guide - Strategies & Tips',
      description: 'Complete sports betting guide with strategies, bankroll management, odds explanations, and winning tips for all major sports.',
      keywords: ['betting guide', 'betting strategies', 'how to bet', 'sports betting tips']
    },
    'company': {
      title: 'About The Betting Insider - Our Mission',
      description: 'Learn about The Betting Insider, our mission to provide data-driven sports betting insights, and our commitment to transparency.',
      keywords: ['about us', 'betting company', 'sports data', 'betting analytics']
    }
  }

  const metadata = pageMetadata[page] || {
    title: page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
    description: DEFAULT_DESCRIPTION,
    keywords: []
  }

  return generateMetadata({
    ...metadata,
    canonical: `/${page}`
  })
}

