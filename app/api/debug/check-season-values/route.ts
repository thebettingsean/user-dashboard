import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check what seasons recent NFL games are stored as
    const gamesQuery = `
      SELECT 
        g.season,
        toString(g.game_time) as game_time,
        toString(g.game_date) as game_date,
        ht.name as home_team,
        at.name as away_team,
        g.home_score,
        g.away_score
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.game_date >= '2025-12-01'
      ORDER BY g.game_date DESC
      LIMIT 20
    `
    
    const games = await clickhouseQuery<any>(gamesQuery)
    
    // Count games by season for December 2025
    const seasonCounts: Record<number, number> = {}
    games.data?.forEach((game: any) => {
      seasonCounts[game.season] = (seasonCounts[game.season] || 0) + 1
    })
    
    return NextResponse.json({
      success: true,
      games: games.data,
      seasonCounts,
      currentLogic: {
        currentDate: new Date().toISOString(),
        currentYear: 2025,
        currentMonth: 12,
        calculatedSeason: 12 >= 9 ? 2025 : 2024,
        explanation: 'currentMonth >= 9 ? currentYear : currentYear - 1',
        issue: 'If games from Dec 2025 are stored as season 2024, they wont show in "This Season" filter'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

