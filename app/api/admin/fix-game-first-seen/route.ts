import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

/**
 * FIX THE ACTUAL TABLE THE FRONTEND READS FROM
 */
export async function GET() {
  try {
    const oddsApiId = '271335072b85daf0ceabb360ef75220e'
    
    // Check game_first_seen table
    const gfs = await clickhouseQuery<any>(`
      SELECT * FROM game_first_seen 
      WHERE odds_api_game_id = '${oddsApiId}'
      LIMIT 5
    `)
    
    // If it exists and is wrong, DELETE and re-INSERT
    if (gfs.data && gfs.data.length > 0) {
      await clickhouseCommand(`
        DELETE FROM game_first_seen 
        WHERE odds_api_game_id = '${oddsApiId}'
      `)
    }
    
    // INSERT correct opening line
    await clickhouseCommand(`
      INSERT INTO game_first_seen (
        odds_api_game_id,
        sport,
        first_seen_time,
        opening_spread,
        opening_total,
        opening_ml_home,
        opening_ml_away,
        bookmaker_count,
        opening_home_spread_juice,
        opening_away_spread_juice,
        opening_over_juice,
        opening_under_juice
      ) VALUES (
        '${oddsApiId}',
        'nfl',
        '2026-01-05 00:00:00',
        -1,
        47.5,
        -113,
        -107,
        15,
        -110,
        -110,
        -110,
        -110
      )
    `)
    
    // Verify
    const final = await clickhouseQuery<any>(`
      SELECT * FROM game_first_seen 
      WHERE odds_api_game_id = '${oddsApiId}'
      LIMIT 1
    `)
    
    return NextResponse.json({
      message: 'ACTUALLY fixed game_first_seen table',
      before: gfs.data,
      after: final.data,
      success: final.data?.[0]?.opening_spread === -1,
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

