import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check live_odds_snapshots coverage
    const snapshotsQuery = await clickhouseQuery(`
      SELECT 
        sport,
        toDate(snapshot_time) as date,
        count() as snapshot_count,
        count(DISTINCT odds_api_game_id) as games_count,
        countIf(public_spread_home_bet_pct > 0 AND public_spread_home_bet_pct < 100) as games_with_splits
      FROM live_odds_snapshots
      WHERE snapshot_time >= now() - INTERVAL 14 DAY
      GROUP BY sport, date
      ORDER BY sport, date DESC
    `)
    
    // Check NFL props in nfl_prop_lines
    const propsQuery = await clickhouseQuery(`
      SELECT 
        toDate(created_at) as date,
        count() as prop_lines_count,
        count(DISTINCT game_id) as games_with_props
      FROM nfl_prop_lines
      WHERE created_at >= now() - INTERVAL 14 DAY
      GROUP BY date
      ORDER BY date DESC
    `)
    
    // Check game_first_seen (opening lines)
    const openingQuery = await clickhouseQuery(`
      SELECT 
        sport,
        toDate(first_seen_time) as date,
        count() as games_count
      FROM game_first_seen
      WHERE first_seen_time >= now() - INTERVAL 14 DAY
      GROUP BY sport, date
      ORDER BY sport, date DESC
    `)
    
    return NextResponse.json({
      success: true,
      coverage: {
        snapshots: snapshotsQuery.data || [],
        props: propsQuery.data || [],
        openingLines: openingQuery.data || []
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

