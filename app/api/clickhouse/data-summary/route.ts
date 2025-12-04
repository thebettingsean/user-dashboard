import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const summary = await clickhouseQuery(`
      SELECT 
        (SELECT count() FROM nfl_games) as total_games,
        (SELECT count() FROM nfl_box_scores_v2) as total_box_scores,
        (SELECT count() FROM nfl_team_stats) as total_team_stats,
        (SELECT count() FROM nfl_team_rankings) as total_rankings,
        (SELECT count(DISTINCT season) FROM nfl_games) as seasons,
        (SELECT min(game_date) FROM nfl_games) as earliest_game,
        (SELECT max(game_date) FROM nfl_games) as latest_game
    `)

    const bySeason = await clickhouseQuery(`
      SELECT 
        season,
        count() as games,
        sum(home_score + away_score) as total_points
      FROM nfl_games
      GROUP BY season
      ORDER BY season
    `)

    const sampleOdds = await clickhouseQuery(`
      SELECT 
        season,
        count() as games_with_odds
      FROM nfl_games
      WHERE spread_close != 0 OR total_close != 0
      GROUP BY season
      ORDER BY season
    `)

    return NextResponse.json({
      success: true,
      summary: summary.data?.[0] || {},
      by_season: bySeason.data || [],
      odds_coverage: sampleOdds.data || []
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

