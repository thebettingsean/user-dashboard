import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * ADMIN: Fix ALL games with missing opening lines RIGHT NOW
 * 
 * This directly updates the games table for any game where spread_open = 0 or NULL
 * by finding the first non-zero snapshot value
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') !== 'false' // Default to true for safety
  const sport = searchParams.get('sport') || 'all'
  
  const results = {
    dryRun,
    sport,
    gamesChecked: 0,
    gamesFixed: 0,
    gamesSkipped: 0,
    errors: [] as string[],
    examples: [] as any[],
  }
  
  try {
    // Find games with missing opening lines
    const sportFilter = sport === 'all' ? '' : `AND g.sport = '${sport}'`
    
    const gamesNeedingFix = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        g.sport,
        ht.name as home_team,
        at.name as away_team,
        g.spread_open,
        g.spread_close,
        g.total_open,
        g.total_close
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE (g.spread_open = 0 OR g.spread_open IS NULL OR g.total_open = 0 OR g.total_open IS NULL)
        ${sportFilter}
        AND g.game_time > now() - INTERVAL 14 DAY
      ORDER BY g.game_time DESC
      LIMIT 200
    `)
    
    if (!gamesNeedingFix.data || gamesNeedingFix.data.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No games need fixing!',
      })
    }
    
    console.log(`[Fix Opening Lines] Found ${gamesNeedingFix.data.length} games to fix`)
    
    for (const game of gamesNeedingFix.data) {
      results.gamesChecked++
      
      try {
        const oddsApiId = game.game_id.split('_')[1]
        if (!oddsApiId) {
          results.gamesSkipped++
          results.errors.push(`${game.game_id}: Could not extract odds API ID`)
          continue
        }
        
        // Get first non-zero values from snapshots
        const firstNonZero = await clickhouseQuery<any>(`
          SELECT 
            argMinIf(spread, snapshot_time, spread != 0 AND spread IS NOT NULL) as first_spread,
            argMinIf(total, snapshot_time, total != 0 AND total IS NOT NULL) as first_total,
            argMinIf(ml_home, snapshot_time, ml_home != 0 AND ml_home IS NOT NULL) as first_ml_home,
            argMinIf(ml_away, snapshot_time, ml_away != 0 AND ml_away IS NOT NULL) as first_ml_away,
            argMinIf(spread_juice_home, snapshot_time, spread_juice_home != -110 AND spread_juice_home IS NOT NULL) as first_juice_home,
            argMinIf(spread_juice_away, snapshot_time, spread_juice_away != -110 AND spread_juice_away IS NOT NULL) as first_juice_away,
            argMinIf(total_juice_over, snapshot_time, total_juice_over != -110 AND total_juice_over IS NOT NULL) as first_juice_over,
            argMinIf(total_juice_under, snapshot_time, total_juice_under != -110 AND total_juice_under IS NOT NULL) as first_juice_under
          FROM live_odds_snapshots
          WHERE odds_api_game_id = '${oddsApiId}'
        `)
        
        if (!firstNonZero.data || firstNonZero.data.length === 0 || !firstNonZero.data[0].first_spread) {
          results.gamesSkipped++
          results.errors.push(`${game.game_id}: No snapshots with non-zero data`)
          continue
        }
        
        const snapshot = firstNonZero.data[0]
        
        // Store example
        if (results.examples.length < 10) {
          results.examples.push({
            game: `${game.away_team} @ ${game.home_team}`,
            gameId: game.game_id,
            before: {
              spread_open: game.spread_open || 0,
              total_open: game.total_open || 0,
            },
            after: {
              spread_open: snapshot.first_spread,
              total_open: snapshot.first_total,
            },
          })
        }
        
        // Update the game by INSERTing a new row (ReplacingMergeTree will replace old)
        if (!dryRun) {
          // First, get the full current game data
          const fullGame = await clickhouseQuery<any>(`
            SELECT * FROM games FINAL WHERE game_id = '${game.game_id}' LIMIT 1
          `)
          
          if (!fullGame.data || fullGame.data.length === 0) {
            results.gamesSkipped++
            results.errors.push(`${game.game_id}: Game not found in database`)
            continue
          }
          
          const currentGame = fullGame.data[0]
          
          // Insert new row with updated opening lines
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
              '${currentGame.game_id}', '${currentGame.sport}', '${currentGame.game_time}', 
              ${currentGame.home_team_id}, ${currentGame.away_team_id},
              ${snapshot.first_spread}, ${currentGame.spread_close}, 
              ${snapshot.first_total}, ${currentGame.total_close},
              ${snapshot.first_ml_home || 0}, ${snapshot.first_ml_away || 0}, 
              ${currentGame.home_ml_close}, ${currentGame.away_ml_close},
              ${currentGame.home_spread_juice}, ${currentGame.away_spread_juice}, 
              ${currentGame.over_juice}, ${currentGame.under_juice},
              ${snapshot.first_juice_home || -110}, ${snapshot.first_juice_away || -110}, 
              ${snapshot.first_juice_over || -110}, ${snapshot.first_juice_under || -110},
              ${currentGame.public_spread_home_bet_pct}, ${currentGame.public_spread_home_money_pct},
              ${currentGame.public_ml_home_bet_pct}, ${currentGame.public_ml_home_money_pct},
              ${currentGame.public_total_over_bet_pct}, ${currentGame.public_total_over_money_pct},
              ${currentGame.spread_home_public_respect}, ${currentGame.spread_home_vegas_backed}, ${currentGame.spread_home_whale_respect},
              ${currentGame.spread_away_public_respect}, ${currentGame.spread_away_vegas_backed}, ${currentGame.spread_away_whale_respect},
              ${currentGame.total_over_public_respect}, ${currentGame.total_over_vegas_backed}, ${currentGame.total_over_whale_respect},
              ${currentGame.total_under_public_respect}, ${currentGame.total_under_vegas_backed}, ${currentGame.total_under_whale_respect},
              ${currentGame.ml_home_public_respect}, ${currentGame.ml_home_vegas_backed}, ${currentGame.ml_home_whale_respect},
              ${currentGame.ml_away_public_respect}, ${currentGame.ml_away_vegas_backed}, ${currentGame.ml_away_whale_respect},
              '${currentGame.status}', ${currentGame.sportsdata_io_score_id}, now()
            )
          `)
        }
        
        results.gamesFixed++
        
      } catch (gameError: any) {
        results.errors.push(`${game.game_id}: ${gameError.message}`)
        console.error(`[Fix Opening Lines] Error fixing game ${game.game_id}:`, gameError.message)
      }
    }
    
    return NextResponse.json({
      ...results,
      message: dryRun 
        ? `DRY RUN: Found ${results.gamesFixed} games that need fixing. Run with ?dryRun=false to apply fixes.`
        : `Successfully fixed ${results.gamesFixed} games! Refresh your page to see changes.`,
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Fix Opening Lines] Fatal Error:', error)
    return NextResponse.json(
      { ...results, error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

