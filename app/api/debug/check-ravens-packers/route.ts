import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Find Ravens @ Packers game
    const gameQuery = await clickhouseQuery(`
      SELECT 
        g.*,
        ht.name as home_team_name,
        at.name as away_team_name
      FROM games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = 'nfl'
        AND (ht.name LIKE '%Ravens%' OR at.name LIKE '%Ravens%'
             OR ht.name LIKE '%Packers%' OR at.name LIKE '%Packers%')
      ORDER BY g.game_time DESC
      LIMIT 3
    `)
    
    return NextResponse.json({
      success: true,
      games: gameQuery.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

