import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Total records
    const total = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_box_scores_v2`)
    
    // Unique records
    const unique = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM (
        SELECT DISTINCT player_id, game_id FROM nfl_box_scores_v2
      )
    `)
    
    // Sample duplicates
    const duplicates = await clickhouseQuery(`
      SELECT player_id, game_id, COUNT(*) as cnt 
      FROM nfl_box_scores_v2 
      GROUP BY player_id, game_id 
      HAVING cnt > 1 
      ORDER BY cnt DESC 
      LIMIT 10
    `)
    
    // By season
    const bySeason = await clickhouseQuery(`
      SELECT season, COUNT(*) as total, COUNT(DISTINCT (player_id, game_id)) as unique_records
      FROM nfl_box_scores_v2
      GROUP BY season
      ORDER BY season
    `)
    
    // Check for anomalous values (unrealistic stats)
    const anomalies = await clickhouseQuery(`
      SELECT 
        b.player_id, 
        p.name as player_name,
        b.game_id, 
        b.game_date,
        b.pass_yards, 
        b.rush_yards, 
        b.receiving_yards
      FROM nfl_box_scores_v2 b
      LEFT JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
      WHERE pass_yards > 800 OR rush_yards > 400 OR receiving_yards > 400
      LIMIT 20
    `)
    
    return NextResponse.json({
      total_records: total.data?.[0]?.cnt,
      unique_records: unique.data?.[0]?.cnt,
      duplicate_ratio: ((total.data?.[0]?.cnt || 0) / (unique.data?.[0]?.cnt || 1)).toFixed(2) + 'x',
      top_duplicates: duplicates.data,
      by_season: bySeason.data,
      anomalous_records: anomalies.data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST to deduplicate
export async function POST() {
  try {
    // Get unique records count first
    const uniqueBefore = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM (
        SELECT DISTINCT player_id, game_id FROM nfl_box_scores_v2
      )
    `)
    
    // Create temp table with unique records
    await clickhouseCommand(`
      CREATE TABLE nfl_box_scores_v2_dedup ENGINE = MergeTree()
      PARTITION BY toYYYYMM(game_date)
      ORDER BY (season, week, game_id, player_id)
      AS SELECT * FROM nfl_box_scores_v2
      WHERE (player_id, game_id, created_at) IN (
        SELECT player_id, game_id, MAX(created_at) 
        FROM nfl_box_scores_v2 
        GROUP BY player_id, game_id
      )
    `)
    
    // Get count from dedup table
    const dedupCount = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_box_scores_v2_dedup`)
    
    // Drop original and rename
    await clickhouseCommand(`DROP TABLE nfl_box_scores_v2`)
    await clickhouseCommand(`RENAME TABLE nfl_box_scores_v2_dedup TO nfl_box_scores_v2`)
    
    // Final count
    const finalCount = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_box_scores_v2`)
    
    return NextResponse.json({
      success: true,
      unique_before: uniqueBefore.data?.[0]?.cnt,
      dedup_count: dedupCount.data?.[0]?.cnt,
      final_count: finalCount.data?.[0]?.cnt
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

