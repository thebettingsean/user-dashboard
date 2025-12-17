import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check what seasons recent NFL games are stored as
    const gamesQuery = `
      SELECT 
        season,
        toString(game_time) as game_time,
        toString(game_date) as game_date,
        home_team_id,
        away_team_id
      FROM nfl_games
      WHERE game_date >= '2025-12-01'
      ORDER BY game_date DESC
      LIMIT 10
    `
    
    const games = await clickhouseQuery<any>(gamesQuery)
    
    return NextResponse.json({
      success: true,
      games: games.data,
      currentLogic: {
        currentYear: 2025,
        currentMonth: 12,
        calculatedSeason: 12 >= 9 ? 2025 : 2024,
        explanation: 'currentMonth >= 9 ? currentYear : currentYear - 1'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

