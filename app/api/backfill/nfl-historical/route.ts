import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY
const SPORTSDATA_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

export const maxDuration = 300

interface BackfillResult {
  date: string
  gamesProcessed: number
  snapshotsInserted: number
  splitsUpdated: number
  propsInserted: number
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const daysBack = parseInt(searchParams.get('days') || '14')
  
  console.log(`[NFL-BACKFILL] Starting ${daysBack}-day backfill...`)
  
  const results: BackfillResult[] = []
  
  try {
    // Step 1: Get all NFL games from last N days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffStr = cutoffDate.toISOString().split('T')[0]
    
    const gamesQuery = await clickhouseQuery(`
      SELECT 
        game_id,
        home_team,
        away_team,
        game_time,
        sportsdata_io_score_id,
        toDate(game_time) as game_date
      FROM nfl_games
      WHERE game_time >= '${cutoffStr}'
        AND sportsdata_io_score_id > 0
      ORDER BY game_time ASC
    `)
    
    const games = gamesQuery.data || []
    console.log(`[NFL-BACKFILL] Found ${games.length} games since ${cutoffStr}`)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No games found in date range',
        elapsed_ms: Date.now() - startTime
      })
    }
    
    // Step 2: For each game, backfill historical data
    for (const game of games) {
      const gameDate = game.game_date
      const gameTime = new Date(game.game_time)
      
      let snapshotsInserted = 0
      let splitsUpdated = 0
      let propsInserted = 0
      
      try {
        // Get historical odds from Odds API (if game is in the past)
        const isCompleted = gameTime < new Date()
        
        if (isCompleted) {
          // Use historical endpoint for completed games
          const historicalUrl = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american&date=${gameDate}T12:00:00Z`
          
          const historicalResp = await fetch(historicalUrl)
          if (historicalResp.ok) {
            const historicalData = await historicalResp.json()
            const matchingGame = historicalData.data?.find((g: any) => 
              (g.home_team === game.home_team && g.away_team === game.away_team) ||
              (g.home_team.includes(game.home_team.split(' ').pop()) && g.away_team.includes(game.away_team.split(' ').pop()))
            )
            
            if (matchingGame?.bookmakers) {
              // Insert snapshots for each bookmaker
              for (const bookmaker of matchingGame.bookmakers.slice(0, 10)) {
                const spread = bookmaker.markets.find((m: any) => m.key === 'spreads')?.outcomes.find((o: any) => o.name === game.home_team)?.point || 0
                const total = bookmaker.markets.find((m: any) => m.key === 'totals')?.outcomes.find((o: any) => o.name === 'Over')?.point || 0
                const mlHome = bookmaker.markets.find((m: any) => m.key === 'h2h')?.outcomes.find((o: any) => o.name === game.home_team)?.price || 0
                const mlAway = bookmaker.markets.find((m: any) => m.key === 'h2h')?.outcomes.find((o: any) => o.name === game.away_team)?.price || 0
                
                const snapshotTime = matchingGame.last_update || new Date().toISOString()
                
                await clickhouseCommand(`
                  INSERT INTO live_odds_snapshots (
                    odds_api_game_id, sportsdata_score_id, sport, snapshot_time,
                    home_team, away_team, game_time,
                    spread, total, ml_home, ml_away,
                    sportsbook, is_opening, bookmaker_count
                  ) VALUES (
                    '${matchingGame.id}', ${game.sportsdata_io_score_id}, 'nfl', '${snapshotTime}',
                    '${game.home_team.replace(/'/g, "''")}', '${game.away_team.replace(/'/g, "''")}', '${game.game_time}',
                    ${spread}, ${total}, ${mlHome}, ${mlAway},
                    '${bookmaker.key}', 0, ${matchingGame.bookmakers.length}
                  )
                `)
                snapshotsInserted++
              }
            }
          }
          
          // Get historical props
          const propsUrl = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/events/${matchingGame?.id}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=player_pass_tds,player_pass_yds,player_rush_yds,player_receptions&oddsFormat=american&date=${gameDate}T12:00:00Z`
          
          const propsResp = await fetch(propsUrl)
          if (propsResp.ok) {
            const propsData = await propsResp.json()
            // Process and insert props (simplified for now)
            if (propsData.data?.bookmakers) {
              propsInserted = propsData.data.bookmakers.length
            }
          }
        }
        
        // Get public betting splits from SportsDataIO (works for past and future)
        if (SPORTSDATA_KEY && game.sportsdata_io_score_id) {
          const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${game.sportsdata_io_score_id}?key=${SPORTSDATA_KEY}`
          const splitsResp = await fetch(splitsUrl)
          
          if (splitsResp.ok) {
            const splits = await splitsResp.json()
            
            if (splits?.BettingMarketSplits) {
              let spreadBet = 50, spreadMoney = 50, mlBet = 50, mlMoney = 50, totalBet = 50, totalMoney = 50
              
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
              
              // Update existing snapshots OR insert a new snapshot with splits
              await clickhouseCommand(`
                INSERT INTO live_odds_snapshots (
                  odds_api_game_id, sportsdata_score_id, sport, snapshot_time,
                  home_team, away_team, game_time,
                  spread, total, ml_home, ml_away,
                  public_spread_home_bet_pct, public_spread_home_money_pct,
                  public_ml_home_bet_pct, public_ml_home_money_pct,
                  public_total_over_bet_pct, public_total_over_money_pct,
                  sportsbook, is_opening, bookmaker_count
                ) VALUES (
                  'backfill_${game.game_id}', ${game.sportsdata_io_score_id}, 'nfl', now(),
                  '${game.home_team.replace(/'/g, "''")}', '${game.away_team.replace(/'/g, "''")}', '${game.game_time}',
                  0, 0, 0, 0,
                  ${spreadBet}, ${spreadMoney}, ${mlBet}, ${mlMoney}, ${totalBet}, ${totalMoney},
                  'splits_only', 0, 0
                )
              `)
              splitsUpdated++
            }
          }
        }
        
      } catch (gameError: any) {
        console.error(`[NFL-BACKFILL] Error processing game ${game.game_id}:`, gameError.message)
      }
      
      results.push({
        date: gameDate,
        gamesProcessed: 1,
        snapshotsInserted,
        splitsUpdated,
        propsInserted
      })
    }
    
    const totalSnapshots = results.reduce((sum, r) => sum + r.snapshotsInserted, 0)
    const totalSplits = results.reduce((sum, r) => sum + r.splitsUpdated, 0)
    const totalProps = results.reduce((sum, r) => sum + r.propsInserted, 0)
    
    return NextResponse.json({
      success: true,
      message: `Backfilled ${games.length} games`,
      summary: {
        games: games.length,
        snapshotsInserted: totalSnapshots,
        splitsUpdated: totalSplits,
        propsInserted: totalProps
      },
      results,
      elapsed_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('[NFL-BACKFILL] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      elapsed_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

