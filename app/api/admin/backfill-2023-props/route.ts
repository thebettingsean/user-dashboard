import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Backfill missing 2023 NFL prop data from Odds API
 * Target: October & November 2023 (96% missing)
 */
export async function POST(request: Request) {
  try {
    const { dryRun = true } = await request.json()
    
    // 1. Get all Oct/Nov 2023 games that don't have props
    const missingGames = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.game_date,
        g.week,
        g.season
      FROM nfl_games g FINAL
      LEFT JOIN (
        SELECT DISTINCT game_id 
        FROM nfl_prop_lines FINAL
      ) pl ON toString(g.game_id) = pl.game_id
      WHERE g.season = 2023
        AND g.is_playoff = 0
        AND toYYYYMM(g.game_date) IN (202310, 202311)
        AND pl.game_id IS NULL
      ORDER BY g.game_date
    `)
    
    const games = missingGames.data || []
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        message: 'Dry run - no data fetched or inserted',
        games_to_backfill: games.length,
        sample_games: games.slice(0, 10),
        next_step: 'Call this endpoint with { "dryRun": false } to start backfill'
      })
    }
    
    // 2. For each game, try to fetch props from Odds API
    const ODDS_API_KEY = process.env.ODDS_API_KEY
    if (!ODDS_API_KEY) {
      throw new Error('ODDS_API_KEY not found in environment')
    }
    
    let successCount = 0
    let failCount = 0
    const results: any[] = []
    
    for (const game of games) {
      try {
        // Note: Odds API historical data endpoint structure
        // We'll need the Odds API game ID, which we don't have for 2023 games
        // This is the core problem - we need to map ESPN game IDs to Odds API game IDs
        
        results.push({
          game_id: game.game_id,
          game_date: game.game_date,
          week: game.week,
          status: 'skipped',
          reason: 'No Odds API game ID mapping available'
        })
        
      } catch (error: any) {
        failCount++
        results.push({
          game_id: game.game_id,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      dry_run: false,
      games_processed: games.length,
      success_count: successCount,
      fail_count: failCount,
      results: results.slice(0, 20),
      issue: 'Cannot backfill without Odds API game ID mapping. Need to create ESPN <-> Odds API ID mapping first.'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

