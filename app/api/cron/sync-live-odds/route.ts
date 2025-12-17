import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

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
  // NBA
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GS', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NY', 'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SA',
  'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
  // NHL
  'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF',
  'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR', 'Chicago Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ', 'Dallas Stars': 'DAL',
  'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA',
  'Los Angeles Kings': 'LA', 'Minnesota Wild': 'MIN', 'Montréal Canadiens': 'MTL',
  'Montreal Canadiens': 'MTL', 'Nashville Predators': 'NSH', 'New Jersey Devils': 'NJ',
  'New York Islanders': 'NYI', 'New York Rangers': 'NYR', 'Ottawa Senators': 'OTT',
  'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJ',
  'Seattle Kraken': 'SEA', 'St Louis Blues': 'STL', 'St. Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TB', 'Toronto Maple Leafs': 'TOR', 'Utah Hockey Club': 'UTAH',
  'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK', 'Washington Capitals': 'WAS',
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
  spreadJuice: number
  total: number
  totalJuice: number
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
  let spread = 0, spreadJuice = -110, total = 0, totalJuice = -110, mlHome = 0, mlAway = 0

  for (const market of bookmaker.markets) {
    if (market.key === 'spreads') {
      for (const outcome of market.outcomes) {
        if (outcome.name === homeTeam) {
          spread = outcome.point || 0
          spreadJuice = outcome.price
        }
      }
    } else if (market.key === 'totals') {
      for (const outcome of market.outcomes) {
        if (outcome.name === 'Over') {
          total = outcome.point || 0
          totalJuice = outcome.price
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

  return { spread, spreadJuice, total, totalJuice, mlHome, mlAway }
}

// Calculate consensus from all bookmakers
function calculateConsensus(bookmakers: OddsApiGame['bookmakers'], homeTeam: string): {
  consensus: BookOdds
  allBooks: Record<string, BookOdds>
  bookCount: number
} {
  const allBooks: Record<string, BookOdds> = {}
  const spreads: number[] = []
  const totals: number[] = []
  const mlHomes: number[] = []
  const mlAways: number[] = []

  for (const book of bookmakers) {
    const odds = extractBookOdds(book, homeTeam)
    allBooks[book.key] = odds
    
    if (odds.spread !== 0) spreads.push(odds.spread)
    if (odds.total !== 0) totals.push(odds.total)
    if (odds.mlHome !== 0) mlHomes.push(odds.mlHome)
    if (odds.mlAway !== 0) mlAways.push(odds.mlAway)
  }

  return {
    consensus: {
      spread: median(spreads),
      spreadJuice: -110,
      total: median(totals),
      totalJuice: -110,
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
      
      if (SPORTSDATA_API_KEY && sportConfig.sport === 'nfl') {
        try {
          // Get ScoreIDs from nfl_games table in ClickHouse
          const scoreIdsQuery = `
            SELECT 
              sportsdata_io_score_id as score_id,
              ht.abbreviation as home_abbr,
              at.abbreviation as away_abbr
            FROM nfl_games g
            LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
            LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
            WHERE g.game_time >= now() - INTERVAL 1 HOUR
              AND g.game_time <= now() + INTERVAL 7 DAY
              AND g.sportsdata_io_score_id > 0
            LIMIT 50
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
              
              if (splitsResponse.ok) {
                const splits = await splitsResponse.json()
                if (splits?.BettingMarketSplits) {
                  const key = `${game.home_abbr}_${game.away_abbr}`.toUpperCase()
                  
                  let spreadBet = 50, spreadMoney = 50, mlBet = 50, mlMoney = 50, totalBet = 50, totalMoney = 50
                  
                  // Debug first game to see what bet types are returned
                  if (nflGamesToFetch.indexOf(game) === 0) {
                    const betTypes = splits.BettingMarketSplits.map((m: any) => m.BettingBetType).join(', ')
                    console.log(`[NFL] Sample bet types for ${game.away_abbr}@${game.home_abbr}: ${betTypes}`)
                  }
                  
                  for (const market of splits.BettingMarketSplits) {
                    const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
                    const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
                    
                    if (market.BettingBetType === 'Spread' && homeSplit) {
                      spreadBet = homeSplit.BetPercentage || 50
                      spreadMoney = homeSplit.MoneyPercentage || 50
                    } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
                      mlBet = homeSplit.BetPercentage || 50
                      mlMoney = homeSplit.MoneyPercentage || 50
                    } else if (market.BettingBetType === 'Total Points' && overSplit) {
                      totalBet = overSplit.BetPercentage || 50
                      totalMoney = overSplit.MoneyPercentage || 50
                    }
                  }
                  
                  publicBettingMap.set(key, { spreadBet, spreadMoney, mlBet, mlMoney, totalBet, totalMoney })
                }
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
      
      // NBA, NHL, CFB: Fetch public betting data
      if (SPORTSDATA_API_KEY && (sportConfig.sport === 'nba' || sportConfig.sport === 'nhl' || sportConfig.sport === 'cfb')) {
        try {
          const gamesToFetch: { gameId: number; homeAbbr: string; awayAbbr: string }[] = []
          const today = new Date()
          const currentYear = today.getFullYear()
          const currentMonth = today.getMonth() // 0-11
          
          if (sportConfig.sport === 'nba') {
            // NBA: Use GamesByDate (API key has access)
            for (let i = 0; i < 7; i++) {
              const date = new Date(today)
              date.setDate(date.getDate() + i)
              const dateStr = date.toISOString().split('T')[0]
              
              try {
                const scheduleUrl = `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${dateStr}?key=${SPORTSDATA_API_KEY}`
                const scheduleResp = await fetch(scheduleUrl)
                
                if (scheduleResp.ok) {
                  const games = await scheduleResp.json()
                  for (const game of games || []) {
                    const gameId = game.GameID || game.GameId
                    if (gameId && game.HomeTeam && game.AwayTeam) {
                      gamesToFetch.push({ gameId, homeAbbr: game.HomeTeam, awayAbbr: game.AwayTeam })
                    }
                  }
                }
              } catch (e) {
                // Continue if single date fails
              }
            }
          } else {
            // NHL and CFB: Use Games/{season} (GamesByDate returns 401)
            // NHL season: Oct 2025 - June 2026 = "2026 season"
            // CFB season: Aug 2025 - Jan 2026 = "2025 season"
            const season = sportConfig.sport === 'nhl'
              ? (currentMonth >= 9 ? currentYear + 1 : currentYear) // Oct+ = next year's season
              : currentYear // CFB uses calendar year
            
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
                  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                  const nextWeekStr = nextWeek.toISOString().split('T')[0]
                  
                  // Filter for upcoming games (within next 7 days)
                  for (const game of allGames || []) {
                    const gameDate = (game.Day || game.DateTime || '').split('T')[0]
                    if (gameDate >= todayStr && gameDate <= nextWeekStr) {
                      const gameId = game.GameID || game.GameId
                      if (gameId && game.HomeTeam && game.AwayTeam) {
                        gamesToFetch.push({ gameId, homeAbbr: game.HomeTeam, awayAbbr: game.AwayTeam })
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
                const key = `${game.homeAbbr}_${game.awayAbbr}`.toUpperCase()
                
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
                  if ((betType.includes('spread') || betType.includes('puck line')) && homeSplit) {
                    spreadBet = homeSplit.BetPercentage || 50
                    spreadMoney = homeSplit.MoneyPercentage || 50
                  } else if (betType.includes('money') && homeSplit) {
                    mlBet = homeSplit.BetPercentage || 50
                    mlMoney = homeSplit.MoneyPercentage || 50
                  } else if ((betType.includes('total') || betType.includes('over')) && overSplit) {
                    totalBet = overSplit.BetPercentage || 50
                    totalMoney = overSplit.MoneyPercentage || 50
                  }
                }
                
                publicBettingMap.set(key, { spreadBet, spreadMoney, mlBet, mlMoney, totalBet, totalMoney })
                gamesWithSplits++
              }
            } catch (e: any) {
              // Log errors for debugging
              console.error(`[${sportConfig.sport.toUpperCase()}] Error fetching splits for game ${game.gameId}:`, e.message)
            }
          }
          console.log(`[${sportConfig.sport.toUpperCase()}] Loaded ${publicBettingMap.size} games with public betting`)
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
          const isOpening = !seenGameIds.has(game.id) ? 1 : 0
          if (isOpening) {
            newGames++
            // Record this as first seen
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
            console.log(`[${sportConfig.sport.toUpperCase()}] NEW GAME: ${game.away_team} @ ${game.home_team} - Opening: ${consensus.spread}`)
          }
          
          // Try to match public betting data
          const homeAbbrev = TEAM_ABBREV_MAP[game.home_team] || game.home_team.split(' ').pop()?.substring(0, 3).toUpperCase()
          const awayAbbrev = TEAM_ABBREV_MAP[game.away_team] || game.away_team.split(' ').pop()?.substring(0, 3).toUpperCase()
          const bettingKey = `${homeAbbrev}_${awayAbbrev}`.toUpperCase()
          const publicData = publicBettingMap.get(bettingKey)
          
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
          
          // ALSO update the universal games table with public betting data
          // ReplacingMergeTree: Must INSERT new row to update (can't ALTER UPDATE key columns)
          try {
            const gameId = `${sportConfig.sport}_${game.id}`
            
            // First, get existing game data
            const existingGame = await clickhouseQuery<any>(`
              SELECT * FROM games WHERE game_id = '${gameId}' LIMIT 1
            `)
            
            if (existingGame.data && existingGame.data.length > 0) {
              const g = existingGame.data[0]
              
              // Re-insert with updated public betting data (ClickHouse will use latest version)
              await clickhouseCommand(`
                INSERT INTO games (
                  game_id, sport, game_time, home_team_id, away_team_id,
                  spread_open, spread_close, total_open, total_close,
                  home_ml_open, away_ml_open, home_ml_close, away_ml_close,
                  public_spread_home_bet_pct, public_spread_home_money_pct,
                  public_ml_home_bet_pct, public_ml_home_money_pct,
                  public_total_over_bet_pct, public_total_over_money_pct,
                  status, sportsdata_io_score_id, updated_at
                ) VALUES (
                  '${g.game_id}', '${g.sport}', '${g.game_time}', ${g.home_team_id}, ${g.away_team_id},
                  ${g.spread_open}, ${consensus.spread}, ${g.total_open}, ${consensus.total},
                  ${g.home_ml_open}, ${g.away_ml_open}, ${consensus.mlHome}, ${consensus.mlAway},
                  ${publicData?.spreadBet || 50}, ${publicData?.spreadMoney || 50},
                  ${publicData?.mlBet || 50}, ${publicData?.mlMoney || 50},
                  ${publicData?.totalBet || 50}, ${publicData?.totalMoney || 50},
                  '${g.status}', ${g.sportsdata_io_score_id || 0}, now()
                )
              `)
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
    results
  })
}
