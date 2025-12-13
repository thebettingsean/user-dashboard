import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check game_first_seen table
    const firstSeenQuery = await clickhouseQuery<any>(`
      SELECT 
        sport,
        count() as games,
        min(first_seen_time) as earliest,
        max(first_seen_time) as latest
      FROM game_first_seen
      GROUP BY sport
    `)

    // Get sample opening lines
    const sampleQuery = await clickhouseQuery<any>(`
      SELECT 
        odds_api_game_id,
        sport,
        toString(first_seen_time) as first_seen_time,
        opening_spread,
        opening_total,
        opening_ml_home,
        opening_ml_away,
        bookmaker_count
      FROM game_first_seen
      WHERE sport = 'nfl'
      ORDER BY first_seen_time DESC
      LIMIT 5
    `)

    // Check snapshots with is_opening flag
    const openingSnapshotsQuery = await clickhouseQuery<any>(`
      SELECT 
        sport,
        countIf(is_opening = 1) as opening_snapshots,
        count() as total_snapshots
      FROM live_odds_snapshots
      GROUP BY sport
    `)

    // Get sample with all_books data
    const allBooksQuery = await clickhouseQuery<any>(`
      SELECT 
        odds_api_game_id,
        home_team,
        away_team,
        spread,
        all_books_spreads,
        bookmaker_count
      FROM live_odds_snapshots
      WHERE sport = 'nfl' AND bookmaker_count > 0
      ORDER BY snapshot_time DESC
      LIMIT 1
    `)

    return NextResponse.json({
      success: true,
      game_first_seen_summary: firstSeenQuery.data || [],
      sample_openings: sampleQuery.data || [],
      opening_snapshots: openingSnapshotsQuery.data || [],
      sample_with_all_books: allBooksQuery.data?.[0] || null
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

