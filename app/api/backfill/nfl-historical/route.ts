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
        g.game_id,
        ht.name as home_team,
        at.name as away_team,
        g.game_time,
        g.sportsdata_io_score_id,
        toDate(g.game_time) as game_date
      FROM nfl_games g
      LEFT JOIN teams ht ON ht.team_id = g.home_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON at.team_id = g.away_team_id AND at.sport = 'nfl'
      WHERE g.game_time >= '${cutoffStr}'
        AND g.sportsdata_io_score_id > 0
      ORDER BY g.game_time ASC
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
        // NOTE: Odds API historical endpoint requires specific date/time format
        // and may have limited data availability. For now, we rely on:
        // 1. Public betting splits from SportsDataIO (done below) ✅
        // 2. Current odds snapshots going forward (from sync-live-odds cron) ✅
        // 3. Props will be backfilled separately using a different approach
        
        // TODO: Implement proper Odds API historical backfill with correct format:
        // Format: https://api.the-odds-api.com/v4/historical/sports/{sport}/odds
        // Requires: date parameter in ISO format, may need multiple calls per day
        // for line movement tracking
        
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

