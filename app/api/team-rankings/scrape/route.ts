import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// In-memory cache with TTL (24 hours)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Team name normalization mapping
const TEAM_NAME_MAP: Record<string, string> = {
  // NFL
  'Arizona Cardinals': 'arizona-cardinals',
  'Atlanta Falcons': 'atlanta-falcons',
  'Baltimore Ravens': 'baltimore-ravens',
  'Buffalo Bills': 'buffalo-bills',
  'Carolina Panthers': 'carolina-panthers',
  'Chicago Bears': 'chicago-bears',
  'Cincinnati Bengals': 'cincinnati-bengals',
  'Cleveland Browns': 'cleveland-browns',
  'Dallas Cowboys': 'dallas-cowboys',
  'Denver Broncos': 'denver-broncos',
  'Detroit Lions': 'detroit-lions',
  'Green Bay Packers': 'green-bay-packers',
  'Houston Texans': 'houston-texans',
  'Indianapolis Colts': 'indianapolis-colts',
  'Jacksonville Jaguars': 'jacksonville-jaguars',
  'Kansas City Chiefs': 'kansas-city-chiefs',
  'Las Vegas Raiders': 'las-vegas-raiders',
  'Los Angeles Chargers': 'los-angeles-chargers',
  'Los Angeles Rams': 'los-angeles-rams',
  'Miami Dolphins': 'miami-dolphins',
  'Minnesota Vikings': 'minnesota-vikings',
  'New England Patriots': 'new-england-patriots',
  'New Orleans Saints': 'new-orleans-saints',
  'New York Giants': 'new-york-giants',
  'New York Jets': 'new-york-jets',
  'Philadelphia Eagles': 'philadelphia-eagles',
  'Pittsburgh Steelers': 'pittsburgh-steelers',
  'San Francisco 49ers': 'san-francisco-49ers',
  'Seattle Seahawks': 'seattle-seahawks',
  'Tampa Bay Buccaneers': 'tampa-bay-buccaneers',
  'Tennessee Titans': 'tennessee-titans',
  'Washington Commanders': 'washington-commanders',
  
  // NBA
  'Atlanta Hawks': 'atlanta-hawks',
  'Boston Celtics': 'boston-celtics',
  'Brooklyn Nets': 'brooklyn-nets',
  'Charlotte Hornets': 'charlotte-hornets',
  'Chicago Bulls': 'chicago-bulls',
  'Cleveland Cavaliers': 'cleveland-cavaliers',
  'Dallas Mavericks': 'dallas-mavericks',
  'Denver Nuggets': 'denver-nuggets',
  'Detroit Pistons': 'detroit-pistons',
  'Golden State Warriors': 'golden-state-warriors',
  'Houston Rockets': 'houston-rockets',
  'Indiana Pacers': 'indiana-pacers',
  'Los Angeles Clippers': 'los-angeles-clippers',
  'Los Angeles Lakers': 'los-angeles-lakers',
  'Memphis Grizzlies': 'memphis-grizzlies',
  'Miami Heat': 'miami-heat',
  'Milwaukee Bucks': 'milwaukee-bucks',
  'Minnesota Timberwolves': 'minnesota-timberwolves',
  'New Orleans Pelicans': 'new-orleans-pelicans',
  'New York Knicks': 'new-york-knicks',
  'Oklahoma City Thunder': 'oklahoma-city-thunder',
  'Orlando Magic': 'orlando-magic',
  'Philadelphia 76ers': 'philadelphia-76ers',
  'Phoenix Suns': 'phoenix-suns',
  'Portland Trail Blazers': 'portland-trail-blazers',
  'Sacramento Kings': 'sacramento-kings',
  'San Antonio Spurs': 'san-antonio-spurs',
  'Toronto Raptors': 'toronto-raptors',
  'Utah Jazz': 'utah-jazz',
  'Washington Wizards': 'washington-wizards',
}

interface TeamStat {
  value: number | string
  rank: number
}

interface TeamRankingsData {
  team: string
  sport: string
  offense: Record<string, TeamStat>
  defense: Record<string, TeamStat>
  rawData: {
    offense: Record<string, string>
    defense: Record<string, string>
  }
  atsResults?: any[] // Optional game-by-game ATS performance
}

function normalizeTeamName(teamName: string): string {
  return TEAM_NAME_MAP[teamName] || teamName.toLowerCase().replace(/\s+/g, '-')
}

function parseStatValue(value: string): { value: number | string; rank: number } {
  // Example: "21.9 (#19)" or "44.79% (#5)"
  const match = value.match(/^([\d.]+%?)\s*\(#(\d+)\)$/)
  if (match) {
    const rawValue = match[1]
    const rank = parseInt(match[2], 10)
    const numericValue = rawValue.includes('%') 
      ? parseFloat(rawValue.replace('%', ''))
      : parseFloat(rawValue)
    return { value: numericValue, rank }
  }
  return { value: value, rank: 999 }
}

async function scrapeTeamStats(sport: string, teamSlug: string): Promise<TeamRankingsData | null> {
  const cacheKey = `${sport}-${teamSlug}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✓ Using cached data for ${cacheKey}`)
    return cached.data
  }

  const url = `https://www.teamrankings.com/${sport}/team/${teamSlug}/stats`
  console.log(`🔍 Scraping TeamRankings: ${url}`)

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

    const teamName = teamSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const data: TeamRankingsData = {
      team: teamName,
      sport: sport.toUpperCase(),
      offense: {},
      defense: {},
      rawData: {
        offense: {},
        defense: {},
      },
    }

    // Parse all stat tables
    $('table').each((_, table) => {
      const $table = $(table)
      const rows = $table.find('tbody tr')

      rows.each((_, row) => {
        const $row = $(row)
        const cells = $row.find('td')

        if (cells.length >= 4) {
          // Offensive stat
          const offenseStatName = $(cells[0]).text().trim()
          const offenseValue = $(cells[1]).text().trim()
          
          // Defensive stat
          const defenseStatName = $(cells[2]).text().trim()
          const defenseValue = $(cells[3]).text().trim()

          if (offenseStatName && offenseValue) {
            const statKey = offenseStatName.replace(/[\/\s]+/g, '_').replace(/[()%]/g, '').toLowerCase()
            data.offense[statKey] = parseStatValue(offenseValue)
            data.rawData.offense[statKey] = offenseValue
          }

          if (defenseStatName && defenseValue) {
            const statKey = defenseStatName.replace(/[\/\s]+/g, '_').replace(/[()%]/g, '').toLowerCase()
            data.defense[statKey] = parseStatValue(defenseValue)
            data.rawData.defense[statKey] = defenseValue
          }
        }
      })
    })

    console.log(`✓ Scraped ${Object.keys(data.offense).length} offensive stats, ${Object.keys(data.defense).length} defensive stats`)

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() })

    return data
  } catch (error) {
    console.error(`✗ Error scraping TeamRankings:`, error)
    return null
  }
}

async function scrapeATSResults(sport: string, teamSlug: string): Promise<any[] | null> {
  const cacheKey = `ats-${sport}-${teamSlug}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✓ Using cached ATS data for ${cacheKey}`)
    return cached.data
  }

  const url = `https://www.teamrankings.com/${sport}/team/${teamSlug}/ats-results`
  console.log(`🔍 Scraping ATS Results: ${url}`)

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

    const atsResults: any[] = []

    // Find the main ATS results table
    $('table').first().find('tbody tr').each((_, row) => {
      const $row = $(row)
      const cells = $row.find('td')

      if (cells.length >= 7) {
        const date = $(cells[0]).text().trim()
        const location = $(cells[1]).text().trim()
        const opponent = $(cells[2]).text().trim()
        const oppRank = $(cells[3]).text().trim()
        const teamLine = $(cells[4]).text().trim()
        const result = $(cells[5]).text().trim()
        const diff = $(cells[6]).text().trim()

        atsResults.push({
          date,
          location, // "Home", "Away", or "Neutral"
          opponent,
          opponent_rank: oppRank ? parseInt(oppRank) : null,
          team_line: teamLine,
          result, // "W by 7", "L by 3", etc.
          ats_diff: diff, // "+1.5", "-2.0", etc.
          covered: diff.startsWith('+') || diff === '0.0'
        })
      }
    })

    if (atsResults.length > 0) {
      cache.set(cacheKey, { data: atsResults, timestamp: Date.now() })
      console.log(`✓ Scraped ${atsResults.length} ATS results`)
    }

    return atsResults
  } catch (error) {
    console.error(`✗ Error scraping ATS results for ${teamSlug}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamName = searchParams.get('team')
    const sport = searchParams.get('sport')?.toLowerCase()
    const includeATS = searchParams.get('includeATS') === 'true' // Optional flag to include ATS results

    if (!teamName || !sport) {
      return NextResponse.json(
        { error: 'team and sport are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== TEAM RANKINGS SCRAPER ===`)
    console.log(`Team: ${teamName}, Sport: ${sport}${includeATS ? ' (with ATS results)' : ''}`)

    const teamSlug = normalizeTeamName(teamName)
    const data = await scrapeTeamStats(sport, teamSlug)

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to scrape team stats' },
        { status: 500 }
      )
    }

    // Optionally include ATS results for deeper game-by-game analysis
    if (includeATS) {
      const atsResults = await scrapeATSResults(sport, teamSlug)
      if (atsResults && atsResults.length > 0) {
        data.atsResults = atsResults
        console.log(`✓ Added ${atsResults.length} ATS results`)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in team rankings scraper:', error)
    return NextResponse.json(
      { error: 'Failed to scrape team stats' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

