import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Show detailed breakdown of opening vs closing line coverage
 */
export async function GET() {
  try {
    const result = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_games,
        SUM(CASE WHEN spread_open != 0 THEN 1 ELSE 0 END) as has_spread_open,
        SUM(CASE WHEN spread_close != 0 THEN 1 ELSE 0 END) as has_spread_close,
        SUM(CASE WHEN total_open != 0 THEN 1 ELSE 0 END) as has_total_open,
        SUM(CASE WHEN total_close != 0 THEN 1 ELSE 0 END) as has_total_close,
        SUM(CASE WHEN spread_open != 0 AND spread_close != 0 THEN 1 ELSE 0 END) as has_both_spread,
        SUM(CASE WHEN total_open != 0 AND total_close != 0 THEN 1 ELSE 0 END) as has_both_total
      FROM nfl_games
      GROUP BY season
      ORDER BY season
    `)
    
    const breakdown = result.data?.map((row: any) => ({
      season: row.season,
      total_games: row.total_games,
      spread: {
        opening: row.has_spread_open,
        closing: row.has_spread_close,
        both: row.has_both_spread,
        opening_pct: Math.round((row.has_spread_open / row.total_games) * 100),
        closing_pct: Math.round((row.has_spread_close / row.total_games) * 100)
      },
      total: {
        opening: row.has_total_open,
        closing: row.has_total_close,
        both: row.has_both_total,
        opening_pct: Math.round((row.has_total_open / row.total_games) * 100),
        closing_pct: Math.round((row.has_total_close / row.total_games) * 100)
      }
    }))
    
    return NextResponse.json({
      success: true,
      breakdown
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

