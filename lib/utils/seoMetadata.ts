import { Metadata } from 'next'

export const sportNames: Record<string, string> = {
  nfl: 'NFL',
  nba: 'NBA',
  nhl: 'NHL',
  mlb: 'MLB',
  ncaaf: 'College Football',
  ncaab: 'College Basketball'
}

export const tabNames: Record<string, string> = {
  games: 'Games',
  picks: 'Picks',
  'ai-scripts': 'AI Scripts',
  'public-betting': 'Public Betting',
  props: 'Props'
}

/**
 * Generates SEO metadata for sport pages
 */
export function generateSportMetadata(
  sport: string,
  tab: string
): Metadata {
  const sportName = sportNames[sport.toLowerCase()] || sport.toUpperCase()
  const tabName = tabNames[tab] || tab
  
  const title = `${sportName} ${tabName} | The Betting Insider`
  const description = getDescription(sport, tab)
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'The Betting Insider'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}

function getDescription(sport: string, tab: string): string {
  const sportName = sportNames[sport.toLowerCase()] || sport.toUpperCase()
  
  const descriptions: Record<string, string> = {
    games: `View all upcoming ${sportName} games with odds, spreads, and betting data. Get comprehensive game insights and analytics.`,
    picks: `Expert ${sportName} betting picks from top analysts. See units, odds, win streaks, and detailed analysis for every pick.`,
    'ai-scripts': `AI-generated ${sportName} game scripts powered by Claude. Advanced analytics combining team stats, trends, and betting data.`,
    'public-betting': `${sportName} public betting trends. Track where the money is going, sharp action, Vegas movements, and betting percentages.`,
    props: `Top ${sportName} player props with odds and lines. Discover the best prop bets for today's games.`
  }
  
  return descriptions[tab] || `${sportName} ${tab} on The Betting Insider`
}

/**
 * Generates SEO metadata for individual game pages
 */
export function generateGameMetadata(
  sport: string,
  awayTeam: string,
  homeTeam: string,
  date: string
): Metadata {
  const sportName = sportNames[sport.toLowerCase()] || sport.toUpperCase()
  const title = `${awayTeam} at ${homeTeam} - ${sportName} Game | The Betting Insider`
  const description = `Complete betting analysis for ${awayTeam} at ${homeTeam}. View picks, AI scripts, public betting trends, odds, and player props.`
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'The Betting Insider'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}

