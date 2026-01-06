import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const results: any = {}
    
    // 1. Check if nfl_upcoming_games table exists and has data
    try {
      const upcomingGames = await clickhouseQuery(`
        SELECT 
          game_id,
          game_time,
          home_team_abbr,
          away_team_abbr
        FROM nfl_upcoming_games
        WHERE game_time > now()
        ORDER BY game_time
        LIMIT 10
      `)
      results.nfl_upcoming_games = {
        exists: true,
        count: upcomingGames.data?.length || 0,
        sample: upcomingGames.data || []
      }
    } catch (e: any) {
      results.nfl_upcoming_games = {
        exists: false,
        error: e.message
      }
    }
    
    // 2. Check nfl_prop_line_snapshots
    try {
      const propSnapshots = await clickhouseQuery(`
        SELECT 
          game_id,
          player_name,
          prop_type,
          line,
          bookmaker,
          snapshot_time
        FROM nfl_prop_line_snapshots
        WHERE snapshot_time > now() - INTERVAL 24 HOUR
        ORDER BY snapshot_time DESC
        LIMIT 10
      `)
      results.nfl_prop_line_snapshots = {
        exists: true,
        recent_count: propSnapshots.data?.length || 0,
        sample: propSnapshots.data || []
      }
    } catch (e: any) {
      results.nfl_prop_line_snapshots = {
        exists: false,
        error: e.message
      }
    }
    
    // 3. Check if we have upcoming props at all
    try {
      const upcomingProps = await clickhouseQuery(`
        SELECT COUNT(*) as cnt
        FROM nfl_prop_line_snapshots
        WHERE game_id IN (
          SELECT toString(game_id) FROM nfl_games 
          WHERE game_time > now() 
          LIMIT 20
        )
      `)
      results.props_for_upcoming_games = upcomingProps.data?.[0]?.cnt || 0
    } catch (e: any) {
      results.props_for_upcoming_games = {
        error: e.message
      }
    }
    
    // 4. Check nfl_games upcoming
    try {
      const nflGames = await clickhouseQuery(`
        SELECT 
          game_id,
          game_time,
          home_team_id,
          away_team_id
        FROM nfl_games
        WHERE game_time > now()
        ORDER BY game_time
        LIMIT 10
      `)
      results.nfl_games_upcoming = {
        count: nflGames.data?.length || 0,
        sample: nflGames.data || []
      }
    } catch (e: any) {
      results.nfl_games_upcoming = {
        error: e.message
      }
    }
    
    return NextResponse.json({
      success: true,
      diagnosis: results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

