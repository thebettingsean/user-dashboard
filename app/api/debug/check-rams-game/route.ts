import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check for Rams game
    const query = `
      SELECT 
        game_id,
        sport,
        game_time,
        game_date,
        home_team_id,
        away_team_id,
        spread_close,
        total_close,
        status,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM games
      WHERE sport = 'nfl'
      ORDER BY game_time
      LIMIT 20
    `
    
    const result = await clickhouseQuery(query)
    
    // Get team names
    const teamsQuery = `SELECT espn_team_id, name, abbreviation FROM teams WHERE sport = 'nfl'`
    const teamsResult = await clickhouseQuery<{ espn_team_id: number; name: string; abbreviation: string }>(teamsQuery)
    const teamsMap = new Map(teamsResult.data.map(t => [t.espn_team_id, t]))
    
    const gamesWithNames = result.data.map((g: any) => ({
      ...g,
      home_team: teamsMap.get(g.home_team_id)?.abbreviation || `ID${g.home_team_id}`,
      away_team: teamsMap.get(g.away_team_id)?.abbreviation || `ID${g.away_team_id}`
    }))
    
    return NextResponse.json({
      totalNFLGames: result.data.length,
      games: gamesWithNames
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

