import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check upcoming games with ScoreIDs
    const upcomingQuery = `
      SELECT 
        game_id,
        season,
        week,
        toString(game_date) as game_date,
        toString(game_time) as game_time_str,
        game_time,
        sportsdata_io_score_id,
        home_team_id,
        away_team_id
      FROM nfl_games
      WHERE game_time >= now() - INTERVAL 2 DAY
      ORDER BY game_time ASC
      LIMIT 20
    `
    
    const upcoming = await clickhouseQuery(upcomingQuery)
    
    // Check latest games in general
    const latestQuery = `
      SELECT 
        game_id,
        season,
        week,
        toString(game_date) as game_date,
        toString(game_time) as game_time,
        sportsdata_io_score_id,
        home_team_id,
        away_team_id
      FROM nfl_games
      ORDER BY game_time DESC
      LIMIT 10
    `
    
    const latest = await clickhouseQuery(latestQuery)
    
    // Count games with ScoreIDs
    const countQuery = `
      SELECT 
        countIf(sportsdata_io_score_id > 0) as with_score_id,
        count() as total
      FROM nfl_games
      WHERE game_time >= now() - INTERVAL 7 DAY
    `
    
    const counts = await clickhouseQuery(countQuery)
    
    return NextResponse.json({
      success: true,
      currentTime: new Date().toISOString(),
      upcoming: upcoming.data,
      latest: latest.data,
      counts: counts.data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

