import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Find all anomalous receiving/rushing yards (> 500 in a single game is suspicious)
    const anomalies = await clickhouseQuery(`
      SELECT 
        p.name,
        b.game_date,
        b.receiving_yards,
        b.rush_yards,
        b.player_id,
        b.game_id
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.player_id
      WHERE b.receiving_yards > 400 OR b.rush_yards > 400
      ORDER BY b.receiving_yards DESC
      LIMIT 50
    `)

    console.log('Anomalies found:', anomalies.data.length)

    // Fix: Set any receiving_yards > 400 to 0 (or we could delete the records)
    // NFL record is 336 receiving yards in a game (Flipper Anderson)
    const fixReceiving = await clickhouseCommand(`
      ALTER TABLE nfl_box_scores_v2
      UPDATE receiving_yards = 0
      WHERE receiving_yards > 400
    `)

    // Fix: Set any rush_yards > 300 to 0
    // NFL record is 296 rushing yards in a game (Adrian Peterson)
    const fixRushing = await clickhouseCommand(`
      ALTER TABLE nfl_box_scores_v2
      UPDATE rush_yards = 0
      WHERE rush_yards > 300
    `)

    // Verify the fix
    const verifyFix = await clickhouseQuery(`
      SELECT 
        p.name,
        b.game_date,
        b.receiving_yards,
        b.rush_yards
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.player_id
      WHERE b.receiving_yards > 200 OR b.rush_yards > 200
      ORDER BY b.receiving_yards DESC
      LIMIT 20
    `)

    return NextResponse.json({
      anomaliesFound: anomalies.data.length,
      anomalies: anomalies.data.slice(0, 10),
      message: 'Fixed anomalous yards values',
      verifyTopYards: verifyFix.data
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

