import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test a simple query for 2023 season spreads
    const response = await fetch('https://thebettinginsider.com/api/query-engine/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'nfl',
        bet_type: 'spread',
        side: 'underdog',
        filters: {
          time_period: 'since_2022', // Should include all 2023 games
          public_bet_pct: { min: 50 } // Underdogs with 50%+ bets
        }
      })
    })
    
    const text = await response.text()
    console.log('[Test 2023 Query] Response status:', response.status)
    console.log('[Test 2023 Query] Response text:', text.substring(0, 500))
    
    const data = text ? JSON.parse(text) : {}
    
    // Group results by season to see distribution
    const bySeason: Record<number, number> = {}
    if (data.games) {
      for (const game of data.games) {
        const season = new Date(game.game_date).getFullYear()
        bySeason[season] = (bySeason[season] || 0) + 1
      }
    }
    
    return NextResponse.json({
      success: data.success,
      total_games: data.total_games,
      hits: data.hits,
      misses: data.misses,
      hit_rate: data.hit_rate,
      games_by_season: bySeason,
      first_10_games: data.games?.slice(0, 10).map((g: any) => ({
        date: g.game_date,
        matchup: `${g.away_team} @ ${g.home_team}`,
        spread: g.line,
        public_bet_pct: g.public_bet_pct
      })),
      error: data.error
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

