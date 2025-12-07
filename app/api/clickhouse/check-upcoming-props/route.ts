import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if we have upcoming prop lines
    const propLineCount = await clickhouseQuery(`
      SELECT count(*) as cnt FROM nfl_prop_line_snapshots
    `)
    
    // Get sample upcoming props
    const sampleProps = await clickhouseQuery(`
      SELECT 
        game_id,
        player_name,
        prop_type,
        line,
        over_odds,
        under_odds,
        bookmaker,
        snapshot_time
      FROM nfl_prop_line_snapshots
      ORDER BY snapshot_time DESC
      LIMIT 10
    `)
    
    // Check upcoming games
    const upcomingGames = await clickhouseQuery(`
      SELECT 
        game_id,
        home_team_abbr,
        away_team_abbr,
        game_time,
        home_rank_vs_wr,
        away_rank_vs_wr
      FROM nfl_upcoming_games
      LIMIT 5
    `)

    return NextResponse.json({
      propLineCount: propLineCount.data[0]?.cnt || 0,
      sampleProps: sampleProps.data,
      upcomingGames: upcomingGames.data
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

