import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'
import { calculateGameSignals } from '@/lib/signals'

// Sport configurations
const SPORTS_CONFIG = [
  { key: 'americanfootball_nfl', sport: 'nfl', sportsdataPath: 'nfl', season: 2025, active: true },
  { key: 'basketball_nba', sport: 'nba', sportsdataPath: 'nba', season: 2025, active: true },
  { key: 'icehockey_nhl', sport: 'nhl', sportsdataPath: 'nhl', season: 2025, active: true },
  { key: 'americanfootball_ncaaf', sport: 'cfb', sportsdataPath: 'cfb', season: 2025, active: true },
  { key: 'basketball_ncaab', sport: 'cbb', sportsdataPath: 'cbb', season: 2026, active: true },
]

// Team abbreviation mapping
const TEAM_ABBREV_MAP: Record<string, string> = {
  // NFL
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
  // NBA - Using SportsDataIO abbreviations for matching
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GS', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NO', 'New York Knicks': 'NY', 'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHO',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SA',
  'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
  // NHL - SportsDataIO abbreviations (exactly matching their API)
  'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF',
  'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR', 'Chicago Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ', 'Dallas Stars': 'DAL',
  'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA',
  'Los Angeles Kings': 'LA', 'Minnesota Wild': 'MIN', 'Montréal Canadiens': 'MON',
  'Montreal Canadiens': 'MON', 'Nashville Predators': 'NAS', 'New Jersey Devils': 'NJ',
  'New York Islanders': 'NYI', 'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT',
  'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJ',
  'Seattle Kraken': 'SEA', 'St Louis Blues': 'STL', 'St. Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TB', 'Toronto Maple Leafs': 'TOR', 'Utah Hockey Club': 'UTA',
  'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VEG', 'Washington Capitals': 'WAS',
  'Winnipeg Jets': 'WPG',
}

interface OddsApiGame {
  id: string
  sport_key: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: {
    key: string
    title: string
    markets: {
      key: string
      outcomes: { name: string; price: number; point?: number }[]
    }[]
  }[]
}

interface BookOdds {
  spread: number
  spreadJuiceHome: number
  spreadJuiceAway: number
  total: number
  overJuice: number
  underJuice: number
  mlHome: number
  mlAway: number
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Extract odds from a bookmaker for a specific team
function extractBookOdds(bookmaker: OddsApiGame['bookmakers'][0], homeTeam: string): BookOdds {
  let spread = 0, spreadJuiceHome = -110, spreadJuiceAway = -110
  let total = 0, overJuice = -110, underJuice = -110
  let mlHome = 0, mlAway = 0

  for (const market of bookmaker.markets) {
    if (market.key === 'spreads') {
      for (const outcome of market.outcomes) {
        if (outcome.name === homeTeam) {
          spread = outcome.point || 0
          spreadJuiceHome = outcome.price
        } else {
          spreadJuiceAway = outcome.price
        }
      }
    } else if (market.key === 'totals') {
      for (const outcome of market.outcomes) {
        if (outcome.name === 'Over') {
          total = outcome.point || 0
          overJuice = outcome.price
        } else if (outcome.name === 'Under') {
          underJuice = outcome.price
        }
      }
    } else if (market.key === 'h2h') {
      for (const outcome of market.outcomes) {
        if (outcome.name === homeTeam) {
          mlHome = outcome.price
        } else {
          mlAway = outcome.price
        }
      }
    }
  }

  return { spread, spreadJuiceHome, spreadJuiceAway, total, overJuice, underJuice, mlHome, mlAway }
}

// Calculate consensus from all bookmakers
function calculateConsensus(bookmakers: OddsApiGame['bookmakers'], homeTeam: string): {
  consensus: BookOdds
  allBooks: Record<string, BookOdds>
  bookCount: number
} {
  const allBooks: Record<string, BookOdds> = {}
  const spreads: number[] = []
  const spreadJuiceHomes: number[] = []
  const spreadJuiceAways: number[] = []
  const totals: number[] = []
  const overJuices: number[] = []
  const underJuices: number[] = []
  const mlHomes: number[] = []
  const mlAways: number[] = []

  for (const book of bookmakers) {
    const odds = extractBookOdds(book, homeTeam)
    allBooks[book.key] = odds
    
    if (odds.spread !== 0) {
      spreads.push(odds.spread)
      spreadJuiceHomes.push(odds.spreadJuiceHome)
      spreadJuiceAways.push(odds.spreadJuiceAway)
    }
    if (odds.total !== 0) {
      totals.push(odds.total)
      overJuices.push(odds.overJuice)
      underJuices.push(odds.underJuice)
    }
    if (odds.mlHome !== 0) mlHomes.push(odds.mlHome)
    if (odds.mlAway !== 0) mlAways.push(odds.mlAway)
  }

  return {
    consensus: {
      spread: median(spreads),
      spreadJuiceHome: Math.round(median(spreadJuiceHomes)) || -110,
      spreadJuiceAway: Math.round(median(spreadJuiceAways)) || -110,
      total: median(totals),
      overJuice: Math.round(median(overJuices)) || -110,
      underJuice: Math.round(median(underJuices)) || -110,
      mlHome: Math.round(median(mlHomes)),
      mlAway: Math.round(median(mlAways)),
    },
    allBooks,
    bookCount: bookmakers.length
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const results: { sport: string; status: string; gamesProcessed: number; newGames: number; gamesWithSplits: number; error?: string }[] = []
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }
  
  const snapshotTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  for (const sportConfig of SPORTS_CONFIG.filter(s => s.active)) {
    try {
      console.log(`[${sportConfig.sport.toUpperCase()}] Starting sync...`)
      
      // Step 1: Fetch current odds from Odds API (ALL bookmakers)
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportConfig.key}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`
      const oddsResponse = await fetch(oddsUrl)
      
      if (!oddsResponse.ok) {
        throw new Error(`Odds API error: ${oddsResponse.status}`)
      }
      
      const oddsGames: OddsApiGame[] = await oddsResponse.json()
      console.log(`[${sportConfig.sport.toUpperCase()}] Found ${oddsGames.length} games with odds`)
      
      // Log remaining API requests
      const remaining = oddsResponse.headers.get('x-requests-remaining')
      const used = oddsResponse.headers.get('x-requests-used')
      console.log(`[ODDS-API] Requests - Used: ${used}, Remaining: ${remaining}`)
      
      if (oddsGames.length === 0) {
        results.push({ sport: sportConfig.sport, status: 'no_games', gamesProcessed: 0, newGames: 0, gamesWithSplits: 0 })
        continue
      }
      
      // Step 2: Get games we've already seen (for opening detection)
      const gameIds = oddsGames.map(g => `'${g.id}'`).join(',')
      const seenGamesQuery = await clickhouseQuery<{ odds_api_game_id: string }>(`
        SELECT DISTINCT odds_api_game_id 
        FROM game_first_seen 
        WHERE odds_api_game_id IN (${gameIds})
      `)
      const seenGameIds = new Set((seenGamesQuery.data || []).map(g => g.odds_api_game_id))
      
      // Step 3: Fetch public betting from SportsDataIO
      // IMPORTANT: Use ScoreIDs from nfl_games table for NFL (ScoresByDate returns 401 for future dates)
      const publicBettingMap = new Map<string, { spreadBet: number; spreadMoney: number; mlBet: number; mlMoney: number; totalBet: number; totalMoney: number }>()
      
      // Map to store SportsDataIO abbreviations by team name (for NBA/NHL matching)
      // Must be defined here so it's accessible in the matching section later
      const sportsDataAbbrevMap = new Map<string, string>()
      
      if (SPORTSDATA_API_KEY && sportConfig.sport === 'nfl') {
        try {
          // Get ScoreIDs from nfl_games table in ClickHouse
          const scoreIdsQuery = `
            SELECT 
              sportsdata_io_score_id as score_id,
              ht.abbreviation as home_abbr,
              at.abbreviation as away_abbr
            FROM nfl_games g
            LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
            LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
            WHERE g.game_time >= now() - INTERVAL 1 HOUR
              AND g.game_time <= now() + INTERVAL 7 DAY
              AND g.sportsdata_io_score_id > 0
          `
          
          const scoreIdsResult = await clickhouseQuery<{
            score_id: number
            home_abbr: string
            away_abbr: string
          }>(scoreIdsQuery)
          
          const scoreIdsData = scoreIdsResult.data || []
          console.log(`[NFL] Found ${scoreIdsData.length} games with ScoreIDs in nfl_games`)
          
          // Fetch betting splits for each ScoreID
          for (const game of scoreIdsData) {
            if (!game.score_id) continue
            
            try {
              const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${game.score_id}?key=${SPORTSDATA_API_KEY}`
              const splitsResponse = await fetch(splitsUrl)
              
              if (!splitsResponse.ok) {
                if (scoreIdsData.indexOf(game) < 3) {
                  console.log(`[NFL] SportsDataIO error for ScoreID ${game.score_id}: ${splitsResponse.status}`)
                }
                continue
              }
              
              const splits = await splitsResponse.json()
              if (splits?.BettingMarketSplits && splits.BettingMarketSplits.length > 0) {
                const key = `${game.home_abbr}_${game.away_abbr}`.toUpperCase()
                
                let spreadBet = 50, spreadMoney = 50, mlBet = 50, mlMoney = 50, totalBet = 50, totalMoney = 50
                  
                  // Debug first game to see what bet types are returned
                  if (scoreIdsData.indexOf(game) === 0) {
                    const betTypes = splits.BettingMarketSplits.map((m: any) => m.BettingBetType).join(', ')
                    console.log(`[NFL] Sample bet types for ${game.away_abbr}@${game.home_abbr}: ${betTypes}`)
                  }
                  
                  let foundSpread = false, foundML = false, foundTotal = false
                  
                  for (const market of splits.BettingMarketSplits) {
                    const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
                    const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
                    
                    if (market.BettingBetType === 'Spread' && homeSplit) {
                      spreadBet = homeSplit.BetPercentage || 50
                      spreadMoney = homeSplit.MoneyPercentage || 50
                      foundSpread = true
                    } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
                      mlBet = homeSplit.BetPercentage || 50
                      mlMoney = homeSplit.MoneyPercentage || 50
                      foundML = true
                    } else if (market.BettingBetType === 'Total Points' && overSplit) {
                      totalBet = overSplit.BetPercentage || 50
                      totalMoney = overSplit.MoneyPercentage || 50
                      foundTotal = true
                    }
                  }
                  
                  // Log if missing data
                  if (!foundTotal && scoreIdsData.indexOf(game) < 5) {
                    console.log(`[NFL] ScoreID ${game.score_id} (${game.away_abbr}@${game.home_abbr}): Missing Total Points data`)
                  }
                  
                // Store under both key orders for flexible matching
                const bettingData = { spreadBet, spreadMoney, mlBet, mlMoney, totalBet, totalMoney }
                publicBettingMap.set(key, bettingData)
                // Also store reverse order
                const reverseKey = `${game.away_abbr}_${game.home_abbr}`.toUpperCase()
                publicBettingMap.set(reverseKey, bettingData)
                gamesWithSplits++
              } else if (scoreIdsData.indexOf(game) < 3) {
                console.log(`[NFL] ScoreID ${game.score_id} returned no BettingMarketSplits`)
              }
            } catch (e) {
              // Continue if single game fails
            }
          }
          console.log(`[NFL] Loaded ${publicBettingMap.size} games with public betting from SportsDataIO`)
        } catch (e: any) {
          console.error(`[NFL] Public betting fetch error:`, e.message)
        }
      }
      
      // NBA, NHL, CFB, CBB: Fetch public betting data
      if (SPORTSDATA_API_KEY && (sportConfig.sport === 'nba' || sportConfig.sport === 'nhl' || sportConfig.sport === 'cfb' || sportConfig.sport === 'cbb')) {
        try {
          const gamesToFetch: { 
            gameId: number; 
            homeAbbr: string; 
            awayAbbr: string;
            homeName?: string;
            awayName?: string;
            gameTime?: string;
          }[] = []
          
          // Clear the map for this sport
          sportsDataAbbrevMap.clear()
          
          // Helper: normalize team name for flexible matching
          const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          // CBB: Fetch teams list to get full team names from abbreviations
          const cbbTeamMap = new Map<string, string>() // Key (abbrev) -> Full Name
          if (sportConfig.sport === 'cbb') {
            try {
              const teamsUrl = `https://api.sportsdata.io/v3/cbb/scores/json/Teams?key=${SPORTSDATA_API_KEY}`
              const teamsResp = await fetch(teamsUrl)
              if (teamsResp.ok) {
                const teams = await teamsResp.json()
                for (const team of teams) {
                  // Key is the abbreviation (e.g., "TULANE"), School + Name is full name (e.g., "Tulane Green Wave")
                  const fullName = `${team.School || ''} ${team.Name || ''}`.trim()
                  if (team.Key && fullName) {
                    cbbTeamMap.set(team.Key, fullName)
                  }
                }
                console.log(`[CBB] Loaded ${cbbTeamMap.size} team mappings`)
              }
            } catch (e) {
              console.error('[CBB] Failed to fetch teams list:', e)
            }
          }
          
          const today = new Date()
          const currentYear = today.getFullYear()
          const currentMonth = today.getMonth() // 0-11
          
          // ALL sports: Use Games/{season} endpoint (GamesByDate returns 401 for NBA)
          {
            // ALL sports: Use Games/{season} (GamesByDate returns 401 for some)
            // NBA season: Oct 2025 - June 2026 = "2026 season"
            // NHL season: Oct 2025 - June 2026 = "2026 season"
            // CFB season: Aug 2025 - Jan 2026 = "2025 season"
            // CBB season: Nov 2025 - Apr 2026 = "2026 season"
            let season: number
            if (sportConfig.sport === 'nba' || sportConfig.sport === 'nhl') {
              season = currentMonth >= 9 ? currentYear + 1 : currentYear // Oct+ = next year's season
            } else if (sportConfig.sport === 'cbb') {
              season = currentMonth >= 10 ? currentYear + 1 : currentYear // Nov+ = next year's season
            } else {
              season = currentYear // CFB uses calendar year
            }
            
            // CFB needs both REG and POST season games (bowl games)
            const seasonsToQuery = sportConfig.sport === 'cfb' 
              ? [season.toString(), `${season}POST`]
              : [season.toString()]
            
            for (const seasonStr of seasonsToQuery) {
              try {
                const gamesUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/scores/json/Games/${seasonStr}?key=${SPORTSDATA_API_KEY}`
                const gamesResp = await fetch(gamesUrl)
                
                if (gamesResp.ok) {
                  const allGames = await gamesResp.json()
                  const todayStr = today.toISOString().split('T')[0]
                  // CBB games might be scheduled further out, use 14 days for CBB
                  const daysAhead = sportConfig.sport === 'cbb' ? 14 : 7
                  const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
                  const futureDateStr = futureDate.toISOString().split('T')[0]
                  
                  // Filter for upcoming games
                  for (const game of allGames || []) {
                    const gameDate = (game.Day || game.DateTime || '').split('T')[0]
                    if (gameDate >= todayStr && gameDate <= futureDateStr) {
                      const gameId = game.GameID || game.GameId
                      if (gameId && game.HomeTeam && game.AwayTeam) {
                        // For CBB, look up full team names from the teams map
                        let homeName = game.HomeTeamName || game.HomeTeam
                        let awayName = game.AwayTeamName || game.AwayTeam
                        
                        if (sportConfig.sport === 'cbb') {
                          homeName = cbbTeamMap.get(game.HomeTeam) || game.HomeTeam
                          awayName = cbbTeamMap.get(game.AwayTeam) || game.AwayTeam
                        }
                        
                        gamesToFetch.push({ 
                          gameId, 
                          homeAbbr: game.HomeTeam, 
                          awayAbbr: game.AwayTeam,
                          homeName,
                          awayName,
                          gameTime: game.DateTime || game.Day
                        })
                        
                        // Store abbreviations for matching (NBA/NHL only)
                        if (sportConfig.sport === 'nba' || sportConfig.sport === 'nhl') {
                          sportsDataAbbrevMap.set(homeName, game.HomeTeam)
                          sportsDataAbbrevMap.set(awayName, game.AwayTeam)
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.error(`[${sportConfig.sport.toUpperCase()}] Error fetching Games/${seasonStr}:`, e)
              }
            }
          }
          
          console.log(`[${sportConfig.sport.toUpperCase()}] Found ${gamesToFetch.length} upcoming games`)
          if (gamesToFetch.length > 0 && gamesToFetch.length <= 5) {
            console.log(`[${sportConfig.sport.toUpperCase()}] Sample games:`, gamesToFetch.map(g => `${g.awayAbbr}@${g.homeAbbr}`).join(', '))
          }
          
          // Fetch betting splits for each game (limit to 30 to avoid rate limits)
          for (const game of gamesToFetch.slice(0, 30)) {
            try {
              const splitsUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/odds/json/BettingSplitsByGameId/${game.gameId}?key=${SPORTSDATA_API_KEY}`
              
              const splitsResponse = await fetch(splitsUrl)
              
              if (!splitsResponse.ok) {
                // Log errors for first few games to help debug
                if (gamesToFetch.indexOf(game) < 3) {
                  console.log(`[${sportConfig.sport.toUpperCase()}] Splits API error for game ${game.gameId} (${game.awayAbbr}@${game.homeAbbr}): ${splitsResponse.status}`)
                }
                continue
              }
              
              const splits = await splitsResponse.json()
              if (splits?.BettingMarketSplits && splits.BettingMarketSplits.length > 0) {
                // Store under MULTIPLE key formats for flexible matching:
                // 1. Abbreviation keys (GS_CHA, CHA_GS)
                // 2. Normalized short name keys (warriors_hornets)
                // 3. Normalized full name if available
                const keys: string[] = []
                
                // Abbreviation-based keys (most reliable for NBA/NHL)
                const abbrevKey = `${game.homeAbbr}_${game.awayAbbr}`.toUpperCase()
                const abbrevKeyReverse = `${game.awayAbbr}_${game.homeAbbr}`.toUpperCase()
                keys.push(abbrevKey, abbrevKeyReverse)
                
                // Normalized short name keys (from SportsDataIO team names)
                if (game.homeName && game.awayName) {
                  const homeNorm = normalizeTeam(game.homeName)
                  const awayNorm = normalizeTeam(game.awayName)
                  keys.push(`${homeNorm}_${awayNorm}`, `${awayNorm}_${homeNorm}`)
                }
                
                let spreadBet = 50, spreadMoney = 50, mlBet = 50, mlMoney = 50, totalBet = 50, totalMoney = 50
                
                // Debug first game to see what bet types are returned
                if (gamesToFetch.indexOf(game) === 0) {
                  const betTypes = splits.BettingMarketSplits.map((m: any) => m.BettingBetType).join(', ')
                  console.log(`[${sportConfig.sport.toUpperCase()}] Sample bet types for ${game.awayAbbr}@${game.homeAbbr}: ${betTypes}`)
                }
                
                for (const market of splits.BettingMarketSplits) {
                  const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
                  const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
                  
                  const betType = (market.BettingBetType || '').toLowerCase()
                  
                  // Handle different bet type names: Spread, Point Spread, Puck Line
                  // Only use data if BetPercentage is not null
                  if ((betType.includes('spread') || betType.includes('puck line')) && homeSplit && homeSplit.BetPercentage !== null) {
                    spreadBet = homeSplit.BetPercentage
                    spreadMoney = homeSplit.MoneyPercentage || 50
                  } else if (betType.includes('money') && homeSplit && homeSplit.BetPercentage !== null) {
                    mlBet = homeSplit.BetPercentage
                    mlMoney = homeSplit.MoneyPercentage || 50
                    // For NHL, Puck Line often has null - use Moneyline for spread if we have no spread data yet
                    if (spreadBet === 50 && sportConfig.sport === 'nhl') {
                      spreadBet = homeSplit.BetPercentage
                      spreadMoney = homeSplit.MoneyPercentage || 50
                    }
                  } else if ((betType.includes('total') || betType.includes('over')) && overSplit && overSplit.BetPercentage !== null) {
                    totalBet = overSplit.BetPercentage
                    totalMoney = overSplit.MoneyPercentage || 50
                  }
                }
                
                // Store under all possible keys for flexible matching
                const bettingData = { spreadBet, spreadMoney, mlBet, mlMoney, totalBet, totalMoney }
                for (const key of keys) {
                  publicBettingMap.set(key, bettingData)
                }
                
                // Debug: Log first few games' keys
                if (gamesToFetch.indexOf(game) < 3) {
                  console.log(`[${sportConfig.sport.toUpperCase()}] Stored splits for game ${game.gameId}:`)
                  console.log(`  Keys: ${keys.join(', ')}`)
                  console.log(`  Splits: spread=${spreadBet}%, ml=${mlBet}%, total=${totalBet}%`)
                }
                gamesWithSplits++
              }
            } catch (e: any) {
              // Log errors for debugging
              console.error(`[${sportConfig.sport.toUpperCase()}] Error fetching splits for game ${game.gameId}:`, e.message)
            }
          }
          console.log(`[${sportConfig.sport.toUpperCase()}] Loaded ${publicBettingMap.size} games with public betting`)
          if (publicBettingMap.size > 0 && publicBettingMap.size <= 10) {
            const sampleKeys = Array.from(publicBettingMap.keys()).slice(0, 5)
            console.log(`[${sportConfig.sport.toUpperCase()}] Sample betting keys:`, sampleKeys.join(', '))
          }
        } catch (e: any) {
          console.error(`[${sportConfig.sport.toUpperCase()}] Public betting fetch error:`, e.message)
        }
      }
      
      // Step 4: Process each game
      let gamesProcessed = 0
      let newGames = 0
      let gamesWithSplits = 0
      
      for (const game of oddsGames) {
        try {
          if (game.bookmakers.length === 0) continue
          
          // Calculate consensus from ALL bookmakers
          const { consensus, allBooks, bookCount } = calculateConsensus(game.bookmakers, game.home_team)
          
          // Check if this is a NEW game (opening line)
          // IMPORTANT: Only record opening lines if we have REAL values (not 0)
          // For NHL especially, spread/total can be 0 initially before real lines are posted
          const hasValidOpeningLines = (
            consensus.spread !== 0 || // Valid spread
            consensus.total !== 0 ||  // Valid total
            (consensus.mlHome !== 0 && consensus.mlAway !== 0) // Valid moneylines
          )
          
          const isOpening = !seenGameIds.has(game.id) && hasValidOpeningLines ? 1 : 0
          if (isOpening) {
            newGames++
            // Record this as first seen with real opening lines
            const gameTime = game.commence_time.replace('T', ' ').replace('Z', '')
            await clickhouseCommand(`
              INSERT INTO game_first_seen (
                odds_api_game_id, sport, first_seen_time, 
                opening_spread, opening_total, opening_ml_home, opening_ml_away, bookmaker_count
              ) VALUES (
                '${game.id}', '${sportConfig.sport}', '${snapshotTime}',
                ${consensus.spread}, ${consensus.total}, ${consensus.mlHome}, ${consensus.mlAway}, ${bookCount}
              )
            `)
            console.log(`[${sportConfig.sport.toUpperCase()}] NEW GAME: ${game.away_team} @ ${game.home_team} - Opening: spread=${consensus.spread}, total=${consensus.total}`)
          } else if (!seenGameIds.has(game.id) && !hasValidOpeningLines) {
            // Game not yet marked as seen because we don't have real lines yet
            console.log(`[${sportConfig.sport.toUpperCase()}] WAITING for real lines: ${game.away_team} @ ${game.home_team} - Current: spread=${consensus.spread}, total=${consensus.total}`)
          }
          
          // Try multiple matching strategies:
          // 1. ABBREVIATION-BASED (most reliable for NBA/NHL)
          // 2. Normalized full team names
          // 3. Normalized short names (last word / mascot)
          
          const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          // Get abbreviations from our map
          const homeAbbr = TEAM_ABBREV_MAP[game.home_team] || ''
          const awayAbbr = TEAM_ABBREV_MAP[game.away_team] || ''
          
          let publicData = null
          
          // Strategy 1: Try abbreviation-based keys (works for NFL, NBA, NHL)
          if (homeAbbr && awayAbbr) {
            const abbrevKey = `${homeAbbr}_${awayAbbr}`.toUpperCase()
            publicData = publicBettingMap.get(abbrevKey)
            if (!publicData) {
              publicData = publicBettingMap.get(`${awayAbbr}_${homeAbbr}`.toUpperCase())
            }
          }
          
          // Strategy 2: Try normalized full team names
          if (!publicData) {
            const homeKey = normalizeTeam(game.home_team)
            const awayKey = normalizeTeam(game.away_team)
            publicData = publicBettingMap.get(`${homeKey}_${awayKey}`)
            if (!publicData) {
              publicData = publicBettingMap.get(`${awayKey}_${homeKey}`)
            }
          }
          
          // Strategy 3: Try just the mascot/last word (e.g., "Warriors" from "Golden State Warriors")
          if (!publicData) {
            const homeMascot = normalizeTeam(game.home_team.split(' ').pop() || '')
            const awayMascot = normalizeTeam(game.away_team.split(' ').pop() || '')
            if (homeMascot && awayMascot) {
              publicData = publicBettingMap.get(`${homeMascot}_${awayMascot}`)
              if (!publicData) {
                publicData = publicBettingMap.get(`${awayMascot}_${homeMascot}`)
              }
            }
          }
          
          if (!publicData && gamesProcessed < 5) {
            console.log(`[${sportConfig.sport.toUpperCase()}] No betting splits for ${game.away_team} @ ${game.home_team}`)
            console.log(`[${sportConfig.sport.toUpperCase()}]   Tried abbrevs: ${homeAbbr}_${awayAbbr} and ${awayAbbr}_${homeAbbr}`)
            const homeNorm = normalizeTeam(game.home_team)
            const awayNorm = normalizeTeam(game.away_team)
            console.log(`[${sportConfig.sport.toUpperCase()}]   Tried normalized: ${homeNorm}_${awayNorm}`)
            const homeMascot = normalizeTeam(game.home_team.split(' ').pop() || '')
            const awayMascot = normalizeTeam(game.away_team.split(' ').pop() || '')
            console.log(`[${sportConfig.sport.toUpperCase()}]   Tried mascots: ${homeMascot}_${awayMascot}`)
            if (publicBettingMap.size > 0) {
              const sampleKeys = Array.from(publicBettingMap.keys()).slice(0, 15)
              console.log(`[${sportConfig.sport.toUpperCase()}]   Available keys (${publicBettingMap.size} total): ${sampleKeys.join(', ')}`)
            }
          }
          
          if (publicData) gamesWithSplits++
          
          // Prepare all_books JSON strings
          const allBooksSpreads = JSON.stringify(Object.fromEntries(
            Object.entries(allBooks).map(([k, v]) => [k, v.spread])
          ))
          const allBooksTotals = JSON.stringify(Object.fromEntries(
            Object.entries(allBooks).map(([k, v]) => [k, v.total])
          ))
          const allBooksMl = JSON.stringify(Object.fromEntries(
            Object.entries(allBooks).map(([k, v]) => [k, { home: v.mlHome, away: v.mlAway }])
          ))
          
          // Insert snapshot with consensus + all books
          const gameTime = game.commence_time.replace('T', ' ').replace('Z', '')
          const insertSql = `
            INSERT INTO live_odds_snapshots (
              odds_api_game_id, sportsdata_score_id, sport, snapshot_time,
              home_team, away_team, game_time,
              spread, spread_juice_home, spread_juice_away,
              total, total_juice_over, total_juice_under,
              ml_home, ml_away,
              public_spread_home_bet_pct, public_spread_home_money_pct,
              public_ml_home_bet_pct, public_ml_home_money_pct,
              public_total_over_bet_pct, public_total_over_money_pct,
              sportsbook, is_opening, bookmaker_count,
              all_books_spreads, all_books_totals, all_books_ml
            ) VALUES (
              '${game.id}', 0, '${sportConfig.sport}', '${snapshotTime}',
              '${game.home_team.replace(/'/g, "''")}', '${game.away_team.replace(/'/g, "''")}', '${gameTime}',
              ${consensus.spread}, ${consensus.spreadJuice}, ${consensus.spreadJuice},
              ${consensus.total}, ${consensus.totalJuice}, ${consensus.totalJuice},
              ${consensus.mlHome}, ${consensus.mlAway},
              ${publicData?.spreadBet || 50}, ${publicData?.spreadMoney || 50},
              ${publicData?.mlBet || 50}, ${publicData?.mlMoney || 50},
              ${publicData?.totalBet || 50}, ${publicData?.totalMoney || 50},
              'consensus', ${isOpening}, ${bookCount},
              '${allBooksSpreads.replace(/'/g, "''")}', 
              '${allBooksTotals.replace(/'/g, "''")}', 
              '${allBooksMl.replace(/'/g, "''")}'
            )
          `
          
          await clickhouseCommand(insertSql)
          gamesProcessed++
          
          // ALSO update the universal games table (for frontend display)
          // ReplacingMergeTree: Must INSERT new row to update
          try {
            const gameId = `${sportConfig.sport}_${game.id}`
            
            // Get or create team IDs
            const getOrCreateTeam = async (teamName: string): Promise<number | null> => {
              try {
                // For CBB, search both 'cbb' and 'ncaab' since our teams table uses 'ncaab' for college basketball
                const sportFilter = sportConfig.sport === 'cbb' 
                  ? `sport IN ('cbb', 'ncaab')` 
                  : `sport = '${sportConfig.sport}'`
                
                // Try to find existing team by exact name match first
                let existingTeam = await clickhouseQuery<{team_id: number, logo_url: string}>(`
                  SELECT team_id, logo_url FROM teams 
                  WHERE ${sportFilter}
                    AND name = '${teamName.replace(/'/g, "''")}'
                  ORDER BY logo_url != '' DESC
                  LIMIT 1
                `)
                
                // If no exact match, try partial matching for college teams
                if (!existingTeam.data?.[0] && sportConfig.sport === 'cbb') {
                  // Try matching by removing common suffixes (mascots) or using first word
                  const teamWords = teamName.split(' ')
                  const firstWord = teamWords[0]
                  
                  existingTeam = await clickhouseQuery<{team_id: number, logo_url: string}>(`
                    SELECT team_id, logo_url FROM teams 
                    WHERE sport = 'ncaab'
                      AND (
                        name LIKE '${firstWord.replace(/'/g, "''")}%'
                        OR name LIKE '%${firstWord.replace(/'/g, "''")}%'
                      )
                    ORDER BY logo_url != '' DESC
                    LIMIT 1
                  `)
                }
            
                if (existingTeam.data?.[0]) {
                  return existingTeam.data[0].team_id
                }
                
                // Team doesn't exist - create it
                // For CBB, use 'ncaab' as the standard sport name
                const dbSport = sportConfig.sport === 'cbb' ? 'ncaab' : sportConfig.sport
                
                // Get max team_id for this sport to avoid conflicts
                const maxTeamQuery = await clickhouseQuery<{max_id: number}>(`
                  SELECT COALESCE(MAX(team_id), 0) as max_id 
                  FROM teams 
                  WHERE ${sportFilter}
                `)
                
                const sportOffset = { nfl: 1000, nba: 2000, nhl: 3000, cfb: 4000, cbb: 5000, ncaab: 5000 }[sportConfig.sport] || 0
                const maxId = maxTeamQuery.data?.[0]?.max_id || sportOffset
                const newTeamId = Math.max(sportOffset, maxId + 1)
                
                // Create abbreviation from team name (last word or first letters)
                const words = teamName.split(' ')
                const abbrev = words.length > 1 
                  ? words[words.length - 1].substring(0, 3).toUpperCase()
                  : teamName.substring(0, 3).toUpperCase()
                
                // Insert new team with standardized sport name
                await clickhouseCommand(`
                  INSERT INTO teams (
                    team_id, sport, name, abbreviation, city, 
                    division, conference, logo_url, created_at, updated_at
                  ) VALUES (
                    ${newTeamId}, '${dbSport}', '${teamName.replace(/'/g, "''")}', '${abbrev}', '',
                    '', '', '', now(), now()
                  )
                `)
                
                console.log(`[${sportConfig.sport}] Created new team: ${teamName} (ID: ${newTeamId}, sport: ${dbSport})`)
                return newTeamId
              } catch (teamError: any) {
                console.error(`[${sportConfig.sport}] Error creating team ${teamName}:`, teamError.message)
                return null
              }
            }
            
            const homeTeamId = await getOrCreateTeam(game.home_team)
            const awayTeamId = await getOrCreateTeam(game.away_team)
            
            if (homeTeamId && awayTeamId) {
              
              // Check if game exists to preserve opening lines
              const existingGame = await clickhouseQuery<any>(`
                SELECT * FROM games WHERE game_id = '${gameId}' ORDER BY updated_at DESC LIMIT 1
              `)
              
              // Get TRUE opening lines from game_first_seen (same source as frontend)
              const firstSeenData = await clickhouseQuery<any>(`
                SELECT opening_spread, opening_total, opening_ml_home, opening_ml_away
                FROM game_first_seen 
                WHERE odds_api_game_id = '${game.id}'
                LIMIT 1
              `)
              const gfs = firstSeenData.data?.[0]
              
              // Use game_first_seen for true opening, fallback to games table, then current
              const spreadOpen = isOpening ? consensus.spread 
                : (gfs?.opening_spread ?? existingGame.data?.[0]?.spread_open ?? consensus.spread)
              const totalOpen = isOpening ? consensus.total 
                : (gfs?.opening_total ?? existingGame.data?.[0]?.total_open ?? consensus.total)
              const mlHomeOpen = isOpening ? consensus.mlHome 
                : (gfs?.opening_ml_home ?? existingGame.data?.[0]?.home_ml_open ?? consensus.mlHome)
              const mlAwayOpen = isOpening ? consensus.mlAway 
                : (gfs?.opening_ml_away ?? existingGame.data?.[0]?.away_ml_open ?? consensus.mlAway)
              
              // Get opening juice values
              // If existing game has default -110, treat as "not yet recorded" and use current
              const existingSpreadJuiceHome = existingGame.data?.[0]?.opening_home_spread_juice
              const existingSpreadJuiceAway = existingGame.data?.[0]?.opening_away_spread_juice
              const existingOverJuice = existingGame.data?.[0]?.opening_over_juice
              const existingUnderJuice = existingGame.data?.[0]?.opening_under_juice
              
              const spreadJuiceHomeOpen = isOpening ? consensus.spreadJuiceHome 
                : (existingSpreadJuiceHome && existingSpreadJuiceHome !== -110 ? existingSpreadJuiceHome : consensus.spreadJuiceHome)
              const spreadJuiceAwayOpen = isOpening ? consensus.spreadJuiceAway 
                : (existingSpreadJuiceAway && existingSpreadJuiceAway !== -110 ? existingSpreadJuiceAway : consensus.spreadJuiceAway)
              const overJuiceOpen = isOpening ? consensus.overJuice 
                : (existingOverJuice && existingOverJuice !== -110 ? existingOverJuice : consensus.overJuice)
              const underJuiceOpen = isOpening ? consensus.underJuice 
                : (existingUnderJuice && existingUnderJuice !== -110 ? existingUnderJuice : consensus.underJuice)
              
              // Calculate signals using opening vs current data
              const signals = calculateGameSignals(
                sportConfig.sport,
                // Spread data
                spreadOpen,
                consensus.spread,
                spreadJuiceHomeOpen,
                consensus.spreadJuiceHome,
                spreadJuiceAwayOpen,
                consensus.spreadJuiceAway,
                publicData?.spreadBet || 50,
                publicData?.spreadMoney || 50,
                // Total data
                totalOpen,
                consensus.total,
                overJuiceOpen,
                consensus.overJuice,
                underJuiceOpen,
                consensus.underJuice,
                publicData?.totalBet || 50,
                publicData?.totalMoney || 50,
                // ML data
                mlHomeOpen,
                consensus.mlHome,
                mlAwayOpen,
                consensus.mlAway,
                publicData?.mlBet || 50,
                publicData?.mlMoney || 50
              )
              
              // Debug log for signal calculation
              const hasAnySignal = signals.spread_home_public_respect > 0 || signals.spread_away_public_respect > 0 ||
                signals.spread_home_vegas_backed > 0 || signals.spread_away_vegas_backed > 0 ||
                signals.spread_home_whale_respect > 0 || signals.spread_away_whale_respect > 0
              if (hasAnySignal) {
                console.log(`[${sportConfig.sport}] SIGNAL DETECTED for ${game.away_team} @ ${game.home_team}:`, {
                  spreadOpen, spreadCurrent: consensus.spread,
                  betPct: publicData?.spreadBet || 50, moneyPct: publicData?.spreadMoney || 50,
                  signals: {
                    spreadHomePublic: signals.spread_home_public_respect,
                    spreadAwayPublic: signals.spread_away_public_respect,
                    spreadHomeVegas: signals.spread_home_vegas_backed,
                    spreadAwayVegas: signals.spread_away_vegas_backed,
                  }
                })
              }
              
              // Insert (will create or update due to ReplacingMergeTree)
              await clickhouseCommand(`
                INSERT INTO games (
                  game_id, sport, game_time, home_team_id, away_team_id,
                  spread_open, spread_close, total_open, total_close,
                  home_ml_open, away_ml_open, home_ml_close, away_ml_close,
                  home_spread_juice, away_spread_juice, over_juice, under_juice,
                  opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
                  public_spread_home_bet_pct, public_spread_home_money_pct,
                  public_ml_home_bet_pct, public_ml_home_money_pct,
                  public_total_over_bet_pct, public_total_over_money_pct,
                  spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
                  spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
                  total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
                  total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
                  ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
                  ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
                  status, sportsdata_io_score_id, updated_at
                ) VALUES (
                  '${gameId}', '${sportConfig.sport}', '${gameTime}', ${homeTeamId}, ${awayTeamId},
                  ${spreadOpen}, ${consensus.spread}, ${totalOpen}, ${consensus.total},
                  ${mlHomeOpen}, ${mlAwayOpen}, ${consensus.mlHome}, ${consensus.mlAway},
                  ${consensus.spreadJuiceHome}, ${consensus.spreadJuiceAway}, ${consensus.overJuice}, ${consensus.underJuice},
                  ${spreadJuiceHomeOpen}, ${spreadJuiceAwayOpen}, ${overJuiceOpen}, ${underJuiceOpen},
                  ${publicData?.spreadBet || 50}, ${publicData?.spreadMoney || 50},
                  ${publicData?.mlBet || 50}, ${publicData?.mlMoney || 50},
                  ${publicData?.totalBet || 50}, ${publicData?.totalMoney || 50},
                  ${signals.spread_home_public_respect}, ${signals.spread_home_vegas_backed}, ${signals.spread_home_whale_respect},
                  ${signals.spread_away_public_respect}, ${signals.spread_away_vegas_backed}, ${signals.spread_away_whale_respect},
                  ${signals.total_over_public_respect}, ${signals.total_over_vegas_backed}, ${signals.total_over_whale_respect},
                  ${signals.total_under_public_respect}, ${signals.total_under_vegas_backed}, ${signals.total_under_whale_respect},
                  ${signals.ml_home_public_respect}, ${signals.ml_home_vegas_backed}, ${signals.ml_home_whale_respect},
                  ${signals.ml_away_public_respect}, ${signals.ml_away_vegas_backed}, ${signals.ml_away_whale_respect},
                  'upcoming', ${existingGame.data?.[0]?.sportsdata_io_score_id || 0}, now()
                )
              `)
            } else {
              console.log(`[${sportConfig.sport}] Skipping games table update for ${game.away_team} @ ${game.home_team} - teams not found`)
            }
          } catch (updateError: any) {
            console.error(`[${sportConfig.sport}] Failed to update games table for ${game.id}:`, updateError.message)
          }
          
        } catch (gameError: any) {
          console.error(`[${sportConfig.sport.toUpperCase()}] Error processing game ${game.id}:`, gameError.message)
        }
      }
      
      results.push({ 
        sport: sportConfig.sport, 
        status: 'success', 
        gamesProcessed,
        newGames,
        gamesWithSplits
      })
      
    } catch (sportError: any) {
      console.error(`[${sportConfig.sport.toUpperCase()}] Error:`, sportError)
      results.push({ 
        sport: sportConfig.sport, 
        status: 'error', 
        gamesProcessed: 0,
        newGames: 0,
        gamesWithSplits: 0,
        error: sportError.message 
      })
    }
  }
  
  // ============================================
  // GAME LIFECYCLE MANAGEMENT
  // ============================================
  
  const lifecycleResults = {
    closingSoon: 0,
    completed: 0,
    boxScoresFetched: 0,
    archived: 0,
    errors: 0
  }
  
  try {
    console.log('[LIFECYCLE] Starting game state management...')
    const now = new Date()
    
    // Step 1: Detect games closing soon (< 30 min from kickoff)
    const closingSoonQuery = await clickhouseQuery<{
      game_id: string
      sport: string
      game_time: string
      home_team_id: number
      away_team_id: number
    }>(`
      SELECT game_id, sport, game_time, home_team_id, away_team_id
      FROM games FINAL
      WHERE status = 'upcoming'
        AND game_time <= now() + INTERVAL 30 MINUTE
        AND game_time > now()
    `)
    
    for (const game of closingSoonQuery.data || []) {
      try {
        await clickhouseCommand(`
          INSERT INTO games (
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            status, sportsdata_io_score_id, updated_at
          )
          SELECT 
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            'closing_soon', sportsdata_io_score_id, now()
          FROM games FINAL
          WHERE game_id = '${game.game_id}'
          ORDER BY updated_at DESC
          LIMIT 1
        `)
        lifecycleResults.closingSoon++
      } catch (e) {
        lifecycleResults.errors++
      }
    }
    
    console.log(`[LIFECYCLE] ${lifecycleResults.closingSoon} games marked as closing soon`)
    
    // Step 2: Detect completed games (game time + 4 hours < now)
    const completedQuery = await clickhouseQuery<{
      game_id: string
      sport: string
      game_time: string
      home_team_id: number
      away_team_id: number
      sportsdata_io_score_id: number
    }>(`
      SELECT game_id, sport, game_time, home_team_id, away_team_id, sportsdata_io_score_id
      FROM games FINAL
      WHERE status IN ('upcoming', 'closing_soon', 'in_progress')
        AND game_time < now() - INTERVAL 4 HOUR
    `)
    
    for (const game of completedQuery.data || []) {
      try {
        // Fetch box score from ESPN if needed
        let boxScoreFetched = false
        
        if (game.sport === 'nfl') {
          try {
            // Check if box score already exists
            const existingBoxScore = await clickhouseQuery(`
              SELECT count(*) as cnt FROM nfl_box_scores_v2 WHERE game_id = '${game.game_id}'
            `)
            
            if (existingBoxScore.data?.[0]?.cnt === 0) {
              // Fetch from ESPN (you'll need to implement this endpoint)
              const espnFetch = await fetch(`https://www.thebettinginsider.com/api/backfill/nfl-box-scores?date=${game.game_time.split(' ')[0]}`)
              if (espnFetch.ok) {
                boxScoreFetched = true
                lifecycleResults.boxScoresFetched++
              }
            }
          } catch (e) {
            console.error(`[LIFECYCLE] Failed to fetch box score for ${game.game_id}`)
          }
        }
        
        // Mark as completed
        await clickhouseCommand(`
          INSERT INTO games (
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            status, sportsdata_io_score_id, updated_at
          )
          SELECT 
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            'completed', sportsdata_io_score_id, now()
          FROM games FINAL
          WHERE game_id = '${game.game_id}'
          ORDER BY updated_at DESC
          LIMIT 1
        `)
        lifecycleResults.completed++
      } catch (e) {
        lifecycleResults.errors++
      }
    }
    
    console.log(`[LIFECYCLE] ${lifecycleResults.completed} games marked as completed`)
    
    // Step 3: Archive old completed games (> 7 days old)
    const archiveQuery = await clickhouseQuery<{game_id: string}>(`
      SELECT game_id
      FROM games FINAL
      WHERE status = 'completed'
        AND game_time < now() - INTERVAL 7 DAY
    `)
    
    for (const game of archiveQuery.data || []) {
      try {
        await clickhouseCommand(`
          INSERT INTO games (
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            status, sportsdata_io_score_id, updated_at
          )
          SELECT 
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            'archived', sportsdata_io_score_id, now()
          FROM games FINAL
          WHERE game_id = '${game.game_id}'
          ORDER BY updated_at DESC
          LIMIT 1
        `)
        lifecycleResults.archived++
      } catch (e) {
        lifecycleResults.errors++
      }
    }
    
    console.log(`[LIFECYCLE] ${lifecycleResults.archived} games archived`)
    console.log(`[LIFECYCLE] Completed with ${lifecycleResults.errors} errors`)
    
  } catch (lifecycleError: any) {
    console.error('[LIFECYCLE] Error:', lifecycleError.message)
  }
  
  const duration = Date.now() - startTime
  const totalGames = results.reduce((sum, r) => sum + r.gamesProcessed, 0)
  const totalNewGames = results.reduce((sum, r) => sum + r.newGames, 0)
  
  console.log(`[SYNC-LIVE-ODDS] Completed in ${duration}ms. Processed ${totalGames} games (${totalNewGames} new).`)
  
  return NextResponse.json({
    success: true,
    snapshotTime,
    duration: `${duration}ms`,
    totalGamesProcessed: totalGames,
    totalNewGames,
    results,
    lifecycle: lifecycleResults
  })
}
