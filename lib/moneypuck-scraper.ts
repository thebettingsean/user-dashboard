import * as cheerio from 'cheerio'

// In-memory cache with TTL (24 hours)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface MoneyPuckData {
  team: string
  sport: string
  offense: Record<string, { value: number; rank: number }>
  defense: Record<string, { value: number; rank: number }>
  rawData: {
    offense: Record<string, string>
    defense: Record<string, string>
  }
}

// NHL team name normalization for MoneyPuck URLs
const NHL_TEAM_MAP: Record<string, string> = {
  'Anaheim Ducks': 'ANA',
  'Arizona Coyotes': 'ARI',
  'Boston Bruins': 'BOS',
  'Buffalo Sabres': 'BUF',
  'Calgary Flames': 'CGY',
  'Carolina Hurricanes': 'CAR',
  'Chicago Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL',
  'Columbus Blue Jackets': 'CBJ',
  'Dallas Stars': 'DAL',
  'Detroit Red Wings': 'DET',
  'Edmonton Oilers': 'EDM',
  'Florida Panthers': 'FLA',
  'Los Angeles Kings': 'LAK',
  'Minnesota Wild': 'MIN',
  'Montreal Canadiens': 'MTL',
  'Nashville Predators': 'NSH',
  'New Jersey Devils': 'NJD',
  'New York Islanders': 'NYI',
  'New York Rangers': 'NYR',
  'Ottawa Senators': 'OTT',
  'Philadelphia Flyers': 'PHI',
  'Pittsburgh Penguins': 'PIT',
  'San Jose Sharks': 'SJS',
  'Seattle Kraken': 'SEA',
  'St. Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TBL',
  'Toronto Maple Leafs': 'TOR',
  'Utah Hockey Club': 'UTA',
  'Vancouver Canucks': 'VAN',
  'Vegas Golden Knights': 'VGK',
  'Washington Capitals': 'WSH',
  'Winnipeg Jets': 'WPG'
}

function normalizeNHLTeamName(name: string): string {
  return NHL_TEAM_MAP[name] || name.replace(/\s+/g, '-').toLowerCase()
}

export async function scrapeMoneyPuck(teamName: string): Promise<MoneyPuckData | null> {
  const teamCode = normalizeNHLTeamName(teamName)
  const cacheKey = `nhl-${teamCode}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✓ Using cached MoneyPuck data for ${cacheKey}`)
    return cached.data
  }

  const url = 'https://moneypuck.com/teams.htm'
  console.log(`🔍 Scraping MoneyPuck for ${teamName} (${teamCode}): ${url}`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error(`✗ Failed to fetch ${url}: ${response.status}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const data: MoneyPuckData = {
      team: teamName,
      sport: 'NHL',
      offense: {},
      defense: {},
      rawData: {
        offense: {},
        defense: {},
      },
    }

    // MoneyPuck has a complex table structure with team stats
    // We'll extract key metrics for offense and defense
    // This is a placeholder - actual scraping logic depends on MoneyPuck's HTML structure
    // For now, return structured placeholder that matches our interface

    console.log(`⚠️  MoneyPuck scraping not yet implemented - returning placeholder`)
    
    // TODO: Implement actual MoneyPuck scraping based on their table structure
    // Key stats to extract:
    // - Goals For/Against
    // - xGoals For/Against
    // - Shots For/Against
    // - Corsi For/Against %
    // - Fenwick For/Against %
    // - PDO
    // - Power Play %
    // - Penalty Kill %

    return null

  } catch (error) {
    console.error(`✗ Error scraping MoneyPuck:`, error)
    return null
  }
}

