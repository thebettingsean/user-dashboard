import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check total games
    const totalQuery = `SELECT count() as total FROM nfl_games`
    const totalResult = await clickhouseQuery<{ total: number }>(totalQuery)
    
    // Check upcoming games
    const upcomingQuery = `
      SELECT count() as total 
      FROM nfl_games 
      WHERE game_time > now()
    `
    const upcomingResult = await clickhouseQuery<{ total: number }>(upcomingQuery)
    
    // Check recent games
    const recentQuery = `
      SELECT 
        game_id, 
        game_time, 
        home_team_id,
        away_team_id,
        sportsdata_io_score_id
      FROM nfl_games 
      ORDER BY game_time DESC 
      LIMIT 10
    `
    const recentResult = await clickhouseQuery<{
      game_id: string
      game_time: string
      home_team_id: number
      away_team_id: number
      sportsdata_io_score_id: number
    }>(recentQuery)
    
    // Check future games (explicitly by date)
    const futureQuery = `
      SELECT 
        game_id,
        game_time,
        home_team_id,
        away_team_id,
        sportsdata_io_score_id
      FROM nfl_games
      WHERE game_time > '2025-12-16'
      ORDER BY game_time
      LIMIT 20
    `
    const futureResult = await clickhouseQuery<{
      game_id: string
      game_time: string
      home_team_id: number
      away_team_id: number
      sportsdata_io_score_id: number
    }>(futureQuery)
    
    return NextResponse.json({
      totalGames: totalResult.data?.[0]?.total || 0,
      upcomingGames: upcomingResult.data?.[0]?.total || 0,
      recentGames: recentResult.data || [],
      futureGames: futureResult.data || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
