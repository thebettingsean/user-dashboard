import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Sample CBB games from live_odds_snapshots
    const snapshotsQuery = await clickhouseQuery(`
      SELECT 
        home_team,
        away_team,
        game_time
      FROM live_odds_snapshots
      WHERE sport = 'cbb'
        AND game_time >= now() - INTERVAL 1 DAY
        AND game_time <= now() + INTERVAL 10 DAY
      LIMIT 10
    `)
    
    // Sample CBB teams from teams table
    const teamsQuery = await clickhouseQuery(`
      SELECT name, abbreviation
      FROM teams
      WHERE sport = 'cbb'
      LIMIT 10
    `)
    
    return NextResponse.json({
      success: true,
      snapshotTeams: snapshotsQuery.data || [],
      dbTeams: teamsQuery.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

