import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check upcoming games with new fields
    const games = await clickhouseQuery(`
      SELECT 
        home_team_abbr,
        away_team_abbr,
        home_win_pct,
        away_win_pct,
        home_wins,
        home_losses,
        away_wins,
        away_losses,
        home_rank_vs_wr,
        home_rank_vs_te,
        home_rank_vs_rb,
        away_rank_vs_wr,
        away_rank_vs_te,
        away_rank_vs_rb,
        home_rank_wr_prod,
        home_rank_te_prod,
        home_rank_rb_prod,
        away_rank_wr_prod,
        away_rank_te_prod,
        away_rank_rb_prod
      FROM nfl_upcoming_games
      LIMIT 5
    `)

    return NextResponse.json({
      gamesWithNewFields: games.data,
      count: games.data.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

