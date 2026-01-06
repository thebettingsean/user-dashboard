import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nba'
  
  try {
    // Get upcoming games from database
    const gamesInDb = await clickhouseQuery(`
      SELECT 
        g.game_id,
        ht.name as home_team,
        at.name as away_team,
        ht.abbreviation as home_abbr,
        at.abbreviation as away_abbr,
        g.public_spread_home_bet_pct
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = '${sport}'
        AND g.game_time >= now() - INTERVAL 1 HOUR
        AND g.game_time <= now() + INTERVAL 7 DAY
      ORDER BY g.game_time
      LIMIT 5
    `)
    
    return NextResponse.json({
      success: true,
      sport,
      games_in_db: gamesInDb.data || [],
      note: "Check if team names/abbreviations from Odds API match what's in the database"
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

