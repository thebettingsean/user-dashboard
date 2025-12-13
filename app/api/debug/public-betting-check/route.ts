import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check snapshots with actual public betting data (non-50%)
    const withPublicBetting = await clickhouseQuery<any>(`
      SELECT 
        sport,
        count() as snapshots_with_data,
        min(snapshot_time) as earliest,
        max(snapshot_time) as latest
      FROM live_odds_snapshots
      WHERE public_spread_home_bet_pct != 50 
        AND public_spread_home_bet_pct != 0
        AND public_spread_home_bet_pct IS NOT NULL
      GROUP BY sport
    `)

    // Check snapshots WITHOUT public betting data
    const withoutPublicBetting = await clickhouseQuery<any>(`
      SELECT 
        sport,
        count() as snapshots_without_data,
        countIf(public_spread_home_bet_pct = 0) as zero_pct,
        countIf(public_spread_home_bet_pct = 50) as fifty_pct
      FROM live_odds_snapshots
      GROUP BY sport
    `)

    // Get a sample of recent snapshots with their public betting values
    const recentSamples = await clickhouseQuery<any>(`
      SELECT 
        odds_api_game_id,
        sport,
        home_team,
        toString(snapshot_time) as snapshot_time,
        public_spread_home_bet_pct,
        public_ml_home_bet_pct,
        public_total_over_bet_pct,
        is_opening
      FROM live_odds_snapshots
      WHERE sport = 'nfl'
      ORDER BY snapshot_time DESC
      LIMIT 10
    `)

    // Check what's in the cron-inserted data vs backfill data
    const cronVsBackfill = await clickhouseQuery<any>(`
      SELECT 
        sport,
        is_opening,
        count() as count,
        avg(public_spread_home_bet_pct) as avg_spread_bet_pct
      FROM live_odds_snapshots
      GROUP BY sport, is_opening
      ORDER BY sport, is_opening
    `)

    return NextResponse.json({
      success: true,
      with_public_betting: withPublicBetting.data,
      without_public_betting: withoutPublicBetting.data,
      recent_samples: recentSamples.data,
      cron_vs_backfill: cronVsBackfill.data
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

