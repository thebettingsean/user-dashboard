import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

// Sport configurations
const SPORTS_CONFIG = [
  { 
    key: 'americanfootball_nfl', 
    sport: 'nfl',
    sportsdataPath: 'nfl',
    season: 2025,
    active: true 
  },
  { 
    key: 'basketball_nba', 
    sport: 'nba',
    sportsdataPath: 'nba',
    season: 2025,
    active: true 
  },
  { 
    key: 'icehockey_nhl', 
    sport: 'nhl',
    sportsdataPath: 'nhl',
    season: 2025,
    active: true 
  },
  { 
    key: 'americanfootball_ncaaf', 
    sport: 'cfb',
    sportsdataPath: 'cfb',
    season: 2025,
    active: true 
  },
]

// Team abbreviation mapping: Odds API full name -> SportsDataIO abbreviation
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
  'Utah Mammoth': 'UTAH', 'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK',
  'Washington Capitals': 'WAS', 'Winnipeg Jets': 'WPG',
}

interface OddsApiGame {
  id: string
  sport_key: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: {
    key: string
    markets: {
      key: string
      outcomes: {
        name: string
        price: number
        point?: number
      }[]
    }[]
  }[]
}

interface ScheduleGame {
  ScoreID: number
  HomeTeam: string
  AwayTeam: string
  Date: string
  Week?: number
}

interface BettingSplit {
  BettingOutcomeType: string
  BetPercentage: number
  MoneyPercentage: number
}

interface BettingMarketSplit {
  BettingBetType: string
  BettingSplits: BettingSplit[]
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const results: { sport: string; status: string; gamesProcessed: number; gamesWithSplits: number; error?: string }[] = []
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }
  
  if (!SPORTSDATA_API_KEY) {
    console.log('[SYNC-LIVE-ODDS] WARNING: SPORTSDATA_IO_SPLITS_KEY not configured - public betting will be 50%')
  }
  
  const snapshotTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  for (const sportConfig of SPORTS_CONFIG.filter(s => s.active)) {
    try {
      console.log(`[${sportConfig.sport.toUpperCase()}] Starting sync...`)
      
      // Step 1: Fetch current odds from Odds API
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportConfig.key}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`
      const oddsResponse = await fetch(oddsUrl)
      
      if (!oddsResponse.ok) {
        throw new Error(`Odds API error: ${oddsResponse.status}`)
      }
      
      const oddsGames: OddsApiGame[] = await oddsResponse.json()
      console.log(`[${sportConfig.sport.toUpperCase()}] Found ${oddsGames.length} games with odds`)
      
      if (oddsGames.length === 0) {
        results.push({ sport: sportConfig.sport, status: 'no_games', gamesProcessed: 0, gamesWithSplits: 0 })
        continue
      }
      
      // Step 2: Build ScoreID map from SportsDataIO schedule (for NFL only right now)
      const scoreIdMap = new Map<string, number>() // "HomeTeam_AwayTeam" -> ScoreID
      
      if (SPORTSDATA_API_KEY && sportConfig.sport === 'nfl') {
        try {
          console.log(`[${sportConfig.sport.toUpperCase()}] Fetching NFL schedule for ScoreIDs...`)
          const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/${sportConfig.season}?key=${SPORTSDATA_API_KEY}`
          const scheduleResponse = await fetch(scheduleUrl)
          
          if (scheduleResponse.ok) {
            const schedule: ScheduleGame[] = await scheduleResponse.json()
            
            // Build lookup map for upcoming games (status = Scheduled)
            for (const game of schedule) {
              if (game.ScoreID && game.HomeTeam && game.AwayTeam && game.HomeTeam !== 'BYE') {
                const key = `${game.HomeTeam}_${game.AwayTeam}`.toUpperCase()
                scoreIdMap.set(key, game.ScoreID)
              }
            }
            console.log(`[${sportConfig.sport.toUpperCase()}] Built ScoreID map with ${scoreIdMap.size} games`)
          } else {
            console.log(`[${sportConfig.sport.toUpperCase()}] Schedule fetch failed: ${scheduleResponse.status}`)
          }
        } catch (e: any) {
          console.log(`[${sportConfig.sport.toUpperCase()}] Schedule fetch error: ${e.message}`)
        }
      }
      
      // Step 3: Process each Odds API game
      let gamesProcessed = 0
      let gamesWithSplits = 0
      
      for (const game of oddsGames) {
        try {
          // Extract odds from first bookmaker (or consensus)
          const bookmaker = game.bookmakers[0]
          if (!bookmaker) continue
          
          let spread = 0, spreadJuiceHome = -110, spreadJuiceAway = -110
          let total = 0, totalJuiceOver = -110, totalJuiceUnder = -110
          let mlHome = 0, mlAway = 0
          
          for (const market of bookmaker.markets) {
            if (market.key === 'spreads') {
              for (const outcome of market.outcomes) {
                if (outcome.name === game.home_team) {
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
                  totalJuiceOver = outcome.price
                } else {
                  totalJuiceUnder = outcome.price
                }
              }
            } else if (market.key === 'h2h') {
              for (const outcome of market.outcomes) {
                if (outcome.name === game.home_team) {
                  mlHome = outcome.price
                } else {
                  mlAway = outcome.price
                }
              }
            }
          }
          
          // Step 4: Try to get public betting data
          let publicSpreadBetPct = 0, publicSpreadMoneyPct = 0
          let publicMlBetPct = 0, publicMlMoneyPct = 0
          let publicTotalBetPct = 0, publicTotalMoneyPct = 0
          let sportsdataScoreId = 0
          
          if (SPORTSDATA_API_KEY && sportConfig.sport === 'nfl') {
            // Get team abbreviations
            const homeAbbrev = TEAM_ABBREV_MAP[game.home_team]
            const awayAbbrev = TEAM_ABBREV_MAP[game.away_team]
            
            if (homeAbbrev && awayAbbrev) {
              const key = `${homeAbbrev}_${awayAbbrev}`.toUpperCase()
              const scoreId = scoreIdMap.get(key)
              
              if (scoreId) {
                sportsdataScoreId = scoreId
                
                try {
                  const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
                  const splitsResponse = await fetch(splitsUrl)
                  
                  if (splitsResponse.ok) {
                    const splitsData = await splitsResponse.json()
                    
                    if (splitsData?.BettingMarketSplits) {
                      for (const market of splitsData.BettingMarketSplits as BettingMarketSplit[]) {
                        const homeSplit = market.BettingSplits?.find((s: BettingSplit) => s.BettingOutcomeType === 'Home')
                        const overSplit = market.BettingSplits?.find((s: BettingSplit) => s.BettingOutcomeType === 'Over')
                        
                        if (market.BettingBetType === 'Spread' && homeSplit) {
                          publicSpreadBetPct = homeSplit.BetPercentage || 0
                          publicSpreadMoneyPct = homeSplit.MoneyPercentage || 0
                        } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
                          publicMlBetPct = homeSplit.BetPercentage || 0
                          publicMlMoneyPct = homeSplit.MoneyPercentage || 0
                        } else if (market.BettingBetType === 'Total Points' && overSplit) {
                          publicTotalBetPct = overSplit.BetPercentage || 0
                          publicTotalMoneyPct = overSplit.MoneyPercentage || 0
                        }
                      }
                      
                      if (publicSpreadBetPct > 0 || publicMlBetPct > 0) {
                        gamesWithSplits++
                        console.log(`[${sportConfig.sport.toUpperCase()}] Got splits for ${game.home_team}: Spread ${publicSpreadBetPct}%/${publicSpreadMoneyPct}%`)
                      }
                    }
                  }
                } catch (e) {
                  // Silently skip if betting splits not available
                }
              } else {
                console.log(`[${sportConfig.sport.toUpperCase()}] No ScoreID for ${homeAbbrev} vs ${awayAbbrev}`)
              }
            }
          }
          
          // Step 5: Insert snapshot into ClickHouse
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
              sportsbook
            ) VALUES (
              '${game.id}', ${sportsdataScoreId}, '${sportConfig.sport}', '${snapshotTime}',
              '${game.home_team.replace(/'/g, "''")}', '${game.away_team.replace(/'/g, "''")}', '${gameTime}',
              ${spread}, ${spreadJuiceHome}, ${spreadJuiceAway},
              ${total}, ${totalJuiceOver}, ${totalJuiceUnder},
              ${mlHome}, ${mlAway},
              ${publicSpreadBetPct}, ${publicSpreadMoneyPct},
              ${publicMlBetPct}, ${publicMlMoneyPct},
              ${publicTotalBetPct}, ${publicTotalMoneyPct},
              '${bookmaker.key}'
            )
          `
          
          await clickhouseCommand(insertSql)
          gamesProcessed++
          
        } catch (gameError: any) {
          console.error(`Error processing game ${game.id}:`, gameError.message)
        }
      }
      
      results.push({ 
        sport: sportConfig.sport, 
        status: 'success', 
        gamesProcessed,
        gamesWithSplits
      })
      
    } catch (sportError: any) {
      console.error(`Error processing ${sportConfig.sport}:`, sportError)
      results.push({ 
        sport: sportConfig.sport, 
        status: 'error', 
        gamesProcessed: 0,
        gamesWithSplits: 0,
        error: sportError.message 
      })
    }
  }
  
  const duration = Date.now() - startTime
  
  // Log summary
  const totalGames = results.reduce((sum, r) => sum + r.gamesProcessed, 0)
  const totalWithSplits = results.reduce((sum, r) => sum + r.gamesWithSplits, 0)
  console.log(`[SYNC-LIVE-ODDS] Completed in ${duration}ms. Processed ${totalGames} games, ${totalWithSplits} with public betting data.`)
  
  return NextResponse.json({
    success: true,
    snapshotTime,
    duration: `${duration}ms`,
    totalGamesProcessed: totalGames,
    totalGamesWithSplits: totalWithSplits,
    results
  })
}
