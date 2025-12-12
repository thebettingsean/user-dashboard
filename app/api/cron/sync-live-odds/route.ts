import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

// Sport configurations
const SPORTS_CONFIG = [
  { 
    key: 'americanfootball_nfl', 
    sport: 'nfl',
    sportsdataPath: 'nfl',
    active: true 
  },
  { 
    key: 'basketball_nba', 
    sport: 'nba',
    sportsdataPath: 'nba',
    active: true 
  },
  { 
    key: 'icehockey_nhl', 
    sport: 'nhl',
    sportsdataPath: 'nhl',
    active: true 
  },
  { 
    key: 'americanfootball_ncaaf', 
    sport: 'cfb',
    sportsdataPath: 'cfb',
    active: true 
  },
  { 
    key: 'baseball_mlb', 
    sport: 'mlb',
    sportsdataPath: 'mlb',
    active: false // Enable during MLB season
  },
]

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

interface BettingSplit {
  BettingOutcomeType: string
  BetPercentage: number
  MoneyPercentage: number
}

interface SportsDataGame {
  ScoreId: number
  HomeTeam: string
  AwayTeam: string
  Date: string
  BettingMarketSplits: {
    BettingBetType: string
    BettingSplits: BettingSplit[]
  }[]
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const results: { sport: string; status: string; gamesProcessed: number; error?: string }[] = []
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_KEY
  
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }
  
  const snapshotTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  
  for (const sportConfig of SPORTS_CONFIG.filter(s => s.active)) {
    try {
      console.log(`[${sportConfig.sport.toUpperCase()}] Fetching odds...`)
      
      // Step 1: Fetch current odds from Odds API
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportConfig.key}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`
      const oddsResponse = await fetch(oddsUrl)
      
      if (!oddsResponse.ok) {
        throw new Error(`Odds API error: ${oddsResponse.status}`)
      }
      
      const games: OddsApiGame[] = await oddsResponse.json()
      console.log(`[${sportConfig.sport.toUpperCase()}] Found ${games.length} games with odds`)
      
      if (games.length === 0) {
        results.push({ sport: sportConfig.sport, status: 'no_games', gamesProcessed: 0 })
        continue
      }
      
      // Step 2: Fetch public betting from SportsDataIO (if available)
      const publicBettingMap = new Map<string, SportsDataGame>()
      
      if (SPORTSDATA_API_KEY) {
        try {
          // Get upcoming games with betting splits
          // We need to fetch by date range - get games for next 7 days
          const today = new Date()
          const schedulePromises = []
          
          for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(date.getDate() + i)
            const dateStr = date.toISOString().split('T')[0]
            
            // Different endpoints for different sports
            let scheduleUrl = ''
            if (sportConfig.sport === 'nfl' || sportConfig.sport === 'cfb') {
              // NFL uses season/week format, but we can also use schedule
              scheduleUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/scores/json/ScoresByDate/${dateStr}?key=${SPORTSDATA_API_KEY}`
            } else {
              scheduleUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/scores/json/GamesByDate/${dateStr}?key=${SPORTSDATA_API_KEY}`
            }
            
            schedulePromises.push(
              fetch(scheduleUrl)
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
            )
          }
          
          const scheduleResults = await Promise.all(schedulePromises)
          const allScheduledGames = scheduleResults.flat()
          
          // For each game, try to get betting splits
          for (const game of allScheduledGames) {
            const scoreId = game.ScoreID || game.GameID || game.ScoreId
            if (!scoreId) continue
            
            try {
              const splitsUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
              const splitsResponse = await fetch(splitsUrl)
              
              if (splitsResponse.ok) {
                const splits = await splitsResponse.json()
                if (splits && splits.BettingMarketSplits) {
                  // Create a key from team names for matching
                  const key = `${game.HomeTeam || game.HomeTeamName}_${game.AwayTeam || game.AwayTeamName}`.toLowerCase()
                  publicBettingMap.set(key, splits)
                }
              }
            } catch (e) {
              // Silently skip if betting splits not available
            }
          }
          
          console.log(`[${sportConfig.sport.toUpperCase()}] Found ${publicBettingMap.size} games with public betting data`)
        } catch (e) {
          console.log(`[${sportConfig.sport.toUpperCase()}] Could not fetch public betting: ${e}`)
        }
      }
      
      // Step 3: Process each game and insert snapshot
      let gamesProcessed = 0
      
      for (const game of games) {
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
          
          // Try to match with public betting data
          let publicSpreadBetPct = 0, publicSpreadMoneyPct = 0
          let publicMlBetPct = 0, publicMlMoneyPct = 0
          let publicTotalBetPct = 0, publicTotalMoneyPct = 0
          let sportsdataScoreId = 0
          
          // Try different key formats for matching
          const keyVariants = [
            `${game.home_team}_${game.away_team}`.toLowerCase(),
            `${game.home_team.split(' ').pop()}_${game.away_team.split(' ').pop()}`.toLowerCase(),
          ]
          
          for (const key of keyVariants) {
            const publicData = publicBettingMap.get(key)
            if (publicData) {
              sportsdataScoreId = publicData.ScoreId || 0
              
              for (const market of publicData.BettingMarketSplits || []) {
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
              break
            }
          }
          
          // Insert snapshot
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
        gamesProcessed 
      })
      
    } catch (sportError: any) {
      console.error(`Error processing ${sportConfig.sport}:`, sportError)
      results.push({ 
        sport: sportConfig.sport, 
        status: 'error', 
        gamesProcessed: 0,
        error: sportError.message 
      })
    }
  }
  
  const duration = Date.now() - startTime
  
  // Log summary
  const totalGames = results.reduce((sum, r) => sum + r.gamesProcessed, 0)
  console.log(`[SYNC-LIVE-ODDS] Completed in ${duration}ms. Processed ${totalGames} games across ${results.length} sports.`)
  
  return NextResponse.json({
    success: true,
    snapshotTime,
    duration: `${duration}ms`,
    totalGamesProcessed: totalGames,
    results
  })
}

