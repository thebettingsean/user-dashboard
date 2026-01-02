import * as cheerio from 'cheerio'

// In-memory cache with TTL (24 hours)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface TeamRankingsData {
  team: string
  sport: string
  offense: Record<string, { value: number; rank: number }>
  defense: Record<string, { value: number; rank: number }>
  rawData: {
    offense: Record<string, string>
    defense: Record<string, string>
  }
}

function parseStatValue(value: string): { value: number; rank: number } {
  const match = value.match(/^([\d.]+%?)\s*\(#(\d+)\)$/)
  if (match) {
    const rawValue = match[1]
    const rank = parseInt(match[2], 10)
    const numericValue = rawValue.includes('%') 
      ? parseFloat(rawValue.replace('%', ''))
      : parseFloat(rawValue)
    return { value: numericValue, rank }
  }
  return { value: parseFloat(value) || 0, rank: 999 }
}

export async function scrapeTeamRankings(sport: string, teamName: string): Promise<TeamRankingsData | null> {
  const teamSlug = normalizeTeamName(teamName)
  const cacheKey = `${sport}-${teamSlug}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✓ Using cached data for ${cacheKey}`)
    return cached.data
  }

  // Map sport to TeamRankings URL format
  const sportUrlMap: Record<string, string> = {
    'cfb': 'college-football',
    'cbb': 'ncaa-basketball',
    'nfl': 'nfl',
    'nba': 'nba',
    'nhl': 'nhl'
  }
  const sportUrl = sportUrlMap[sport.toLowerCase()] || sport
  const url = `https://www.teamrankings.com/${sportUrl}/team/${teamSlug}/stats`
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

    const displayName = teamSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const data: TeamRankingsData = {
      team: displayName,
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

// Team name normalization
function normalizeTeamName(teamName: string): string {
  const TEAM_NAME_MAP: Record<string, string> = {
    // NFL
    'Arizona Cardinals': 'arizona-cardinals', 'Cardinals': 'arizona-cardinals',
    'Atlanta Falcons': 'atlanta-falcons', 'Falcons': 'atlanta-falcons',
    'Baltimore Ravens': 'baltimore-ravens', 'Ravens': 'baltimore-ravens',
    'Buffalo Bills': 'buffalo-bills', 'Bills': 'buffalo-bills',
    'Carolina Panthers': 'carolina-panthers', 'Panthers': 'carolina-panthers',
    'Chicago Bears': 'chicago-bears', 'Bears': 'chicago-bears',
    'Cincinnati Bengals': 'cincinnati-bengals', 'Bengals': 'cincinnati-bengals',
    'Cleveland Browns': 'cleveland-browns', 'Browns': 'cleveland-browns',
    'Dallas Cowboys': 'dallas-cowboys', 'Cowboys': 'dallas-cowboys',
    'Denver Broncos': 'denver-broncos', 'Broncos': 'denver-broncos',
    'Detroit Lions': 'detroit-lions', 'Lions': 'detroit-lions',
    'Green Bay Packers': 'green-bay-packers', 'Packers': 'green-bay-packers',
    'Houston Texans': 'houston-texans', 'Texans': 'houston-texans',
    'Indianapolis Colts': 'indianapolis-colts', 'Colts': 'indianapolis-colts',
    'Jacksonville Jaguars': 'jacksonville-jaguars', 'Jaguars': 'jacksonville-jaguars',
    'Kansas City Chiefs': 'kansas-city-chiefs', 'Chiefs': 'kansas-city-chiefs',
    'Las Vegas Raiders': 'las-vegas-raiders', 'Raiders': 'las-vegas-raiders',
    'Los Angeles Chargers': 'los-angeles-chargers', 'Chargers': 'los-angeles-chargers',
    'Los Angeles Rams': 'los-angeles-rams', 'Rams': 'los-angeles-rams',
    'Miami Dolphins': 'miami-dolphins', 'Dolphins': 'miami-dolphins',
    'Minnesota Vikings': 'minnesota-vikings', 'Vikings': 'minnesota-vikings',
    'New England Patriots': 'new-england-patriots', 'Patriots': 'new-england-patriots',
    'New Orleans Saints': 'new-orleans-saints', 'Saints': 'new-orleans-saints',
    'New York Giants': 'new-york-giants', 'Giants': 'new-york-giants',
    'New York Jets': 'new-york-jets', 'Jets': 'new-york-jets',
    'Philadelphia Eagles': 'philadelphia-eagles', 'Eagles': 'philadelphia-eagles',
    'Pittsburgh Steelers': 'pittsburgh-steelers', 'Steelers': 'pittsburgh-steelers',
    'San Francisco 49ers': 'san-francisco-49ers', '49ers': 'san-francisco-49ers',
    'Seattle Seahawks': 'seattle-seahawks', 'Seahawks': 'seattle-seahawks',
    'Tampa Bay Buccaneers': 'tampa-bay-buccaneers', 'Buccaneers': 'tampa-bay-buccaneers',
    'Tennessee Titans': 'tennessee-titans', 'Titans': 'tennessee-titans',
    'Washington Commanders': 'washington-commanders', 'Commanders': 'washington-commanders',
    
    // NBA
    'Atlanta Hawks': 'atlanta-hawks', 'Hawks': 'atlanta-hawks',
    'Boston Celtics': 'boston-celtics', 'Celtics': 'boston-celtics',
    'Brooklyn Nets': 'brooklyn-nets', 'Nets': 'brooklyn-nets',
    'Charlotte Hornets': 'charlotte-hornets', 'Hornets': 'charlotte-hornets',
    'Chicago Bulls': 'chicago-bulls', 'Bulls': 'chicago-bulls',
    'Cleveland Cavaliers': 'cleveland-cavaliers', 'Cavaliers': 'cleveland-cavaliers',
    'Dallas Mavericks': 'dallas-mavericks', 'Mavericks': 'dallas-mavericks',
    'Denver Nuggets': 'denver-nuggets', 'Nuggets': 'denver-nuggets',
    'Detroit Pistons': 'detroit-pistons', 'Pistons': 'detroit-pistons',
    'Golden State Warriors': 'golden-state-warriors', 'Warriors': 'golden-state-warriors',
    'Houston Rockets': 'houston-rockets', 'Rockets': 'houston-rockets',
    'Indiana Pacers': 'indiana-pacers', 'Pacers': 'indiana-pacers',
    'LA Clippers': 'la-clippers', 'Clippers': 'la-clippers',
    'Los Angeles Lakers': 'los-angeles-lakers', 'Lakers': 'los-angeles-lakers',
    'Memphis Grizzlies': 'memphis-grizzlies', 'Grizzlies': 'memphis-grizzlies',
    'Miami Heat': 'miami-heat', 'Heat': 'miami-heat',
    'Milwaukee Bucks': 'milwaukee-bucks', 'Bucks': 'milwaukee-bucks',
    'Minnesota Timberwolves': 'minnesota-timberwolves', 'Timberwolves': 'minnesota-timberwolves',
    'New Orleans Pelicans': 'new-orleans-pelicans', 'Pelicans': 'new-orleans-pelicans',
    'New York Knicks': 'new-york-knicks', 'Knicks': 'new-york-knicks',
    'Oklahoma City Thunder': 'oklahoma-city-thunder', 'Thunder': 'oklahoma-city-thunder',
    'Orlando Magic': 'orlando-magic', 'Magic': 'orlando-magic',
    'Philadelphia 76ers': 'philadelphia-76ers', '76ers': 'philadelphia-76ers',
    'Phoenix Suns': 'phoenix-suns', 'Suns': 'phoenix-suns',
    'Portland Trail Blazers': 'portland-trail-blazers', 'Trail Blazers': 'portland-trail-blazers', 'Blazers': 'portland-trail-blazers',
    'Sacramento Kings': 'sacramento-kings', 'Kings': 'sacramento-kings',
    'San Antonio Spurs': 'san-antonio-spurs', 'Spurs': 'san-antonio-spurs',
    'Toronto Raptors': 'toronto-raptors', 'Raptors': 'toronto-raptors',
    'Utah Jazz': 'utah-jazz', 'Jazz': 'utah-jazz',
    'Washington Wizards': 'washington-wizards', 'Wizards': 'washington-wizards',
    
    // NHL
    'Anaheim Ducks': 'anaheim-ducks', 'Ducks': 'anaheim-ducks',
    'Arizona Coyotes': 'arizona-coyotes', 'Coyotes': 'arizona-coyotes',
    'Boston Bruins': 'boston-bruins', 'Bruins': 'boston-bruins',
    'Buffalo Sabres': 'buffalo-sabres', 'Sabres': 'buffalo-sabres',
    'Calgary Flames': 'calgary-flames', 'Flames': 'calgary-flames',
    'Carolina Hurricanes': 'carolina-hurricanes', 'Hurricanes': 'carolina-hurricanes',
    'Chicago Blackhawks': 'chicago-blackhawks', 'Blackhawks': 'chicago-blackhawks',
    'Colorado Avalanche': 'colorado-avalanche', 'Avalanche': 'colorado-avalanche',
    'Columbus Blue Jackets': 'columbus-blue-jackets', 'Blue Jackets': 'columbus-blue-jackets',
    'Dallas Stars': 'dallas-stars', 'Stars': 'dallas-stars',
    'Detroit Red Wings': 'detroit-red-wings', 'Red Wings': 'detroit-red-wings',
    'Edmonton Oilers': 'edmonton-oilers', 'Oilers': 'edmonton-oilers',
    'Florida Panthers': 'florida-panthers',
    'Los Angeles Kings': 'los-angeles-kings',
    'Minnesota Wild': 'minnesota-wild', 'Wild': 'minnesota-wild',
    'Montreal Canadiens': 'montreal-canadiens', 'Canadiens': 'montreal-canadiens',
    'Nashville Predators': 'nashville-predators', 'Predators': 'nashville-predators',
    'New Jersey Devils': 'new-jersey-devils', 'Devils': 'new-jersey-devils',
    'New York Islanders': 'new-york-islanders', 'Islanders': 'new-york-islanders',
    'New York Rangers': 'new-york-rangers', 'Rangers': 'new-york-rangers',
    'Ottawa Senators': 'ottawa-senators', 'Senators': 'ottawa-senators',
    'Philadelphia Flyers': 'philadelphia-flyers', 'Flyers': 'philadelphia-flyers',
    'Pittsburgh Penguins': 'pittsburgh-penguins', 'Penguins': 'pittsburgh-penguins',
    'San Jose Sharks': 'san-jose-sharks', 'Sharks': 'san-jose-sharks',
    'Seattle Kraken': 'seattle-kraken', 'Kraken': 'seattle-kraken',
    'St. Louis Blues': 'st-louis-blues', 'Blues': 'st-louis-blues',
    'Tampa Bay Lightning': 'tampa-bay-lightning', 'Lightning': 'tampa-bay-lightning',
    'Toronto Maple Leafs': 'toronto-maple-leafs', 'Maple Leafs': 'toronto-maple-leafs',
    'Utah Hockey Club': 'utah-hockey-club',
    'Vancouver Canucks': 'vancouver-canucks', 'Canucks': 'vancouver-canucks',
    'Vegas Golden Knights': 'vegas-golden-knights', 'Golden Knights': 'vegas-golden-knights',
    'Washington Capitals': 'washington-capitals', 'Capitals': 'washington-capitals',
    'Winnipeg Jets': 'winnipeg-jets',
  }

  // Direct lookup
  if (TEAM_NAME_MAP[teamName]) {
    return TEAM_NAME_MAP[teamName]
  }

  // Fallback: normalize manually (works well for college teams)
  // This handles names like "Ohio State Buckeyes" -> "ohio-state-buckeyes"
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

