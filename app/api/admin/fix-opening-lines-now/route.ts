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
        
        // Update the game
        if (!dryRun) {
          await clickhouseCommand(`
            ALTER TABLE games
            UPDATE 
              spread_open = ${snapshot.first_spread},
              total_open = ${snapshot.first_total},
              home_ml_open = ${snapshot.first_ml_home || 0},
              away_ml_open = ${snapshot.first_ml_away || 0},
              opening_home_spread_juice = ${snapshot.first_juice_home || -110},
              opening_away_spread_juice = ${snapshot.first_juice_away || -110},
              opening_over_juice = ${snapshot.first_juice_over || -110},
              opening_under_juice = ${snapshot.first_juice_under || -110},
              updated_at = now()
            WHERE game_id = '${game.game_id}'
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

