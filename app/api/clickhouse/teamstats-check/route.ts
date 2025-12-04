import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    const total = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_team_stats`)
    const unique = await clickhouseQuery(`
      SELECT COUNT(*) as cnt FROM (
        SELECT DISTINCT team_id, game_id FROM nfl_team_stats
      )
    `)
    
    const bySeason = await clickhouseQuery(`
      SELECT season, COUNT(*) as total, COUNT(DISTINCT (team_id, game_id)) as unique_records
      FROM nfl_team_stats
      GROUP BY season
      ORDER BY season
    `)
    
    return NextResponse.json({
      total_records: total.data?.[0]?.cnt,
      unique_records: unique.data?.[0]?.cnt,
      duplicate_ratio: ((total.data?.[0]?.cnt || 0) / (unique.data?.[0]?.cnt || 1)).toFixed(2) + 'x',
      by_season: bySeason.data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Create temp table with unique records
    await clickhouseCommand(`
      CREATE TABLE nfl_team_stats_dedup ENGINE = MergeTree()
      PARTITION BY toYYYYMM(game_date)
      ORDER BY (season, week, game_id, team_id)
      AS SELECT * FROM nfl_team_stats
      WHERE (team_id, game_id, created_at) IN (
        SELECT team_id, game_id, MAX(created_at) 
        FROM nfl_team_stats 
        GROUP BY team_id, game_id
      )
    `)
    
    const dedupCount = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_team_stats_dedup`)
    
    await clickhouseCommand(`DROP TABLE nfl_team_stats`)
    await clickhouseCommand(`RENAME TABLE nfl_team_stats_dedup TO nfl_team_stats`)
    
    const finalCount = await clickhouseQuery(`SELECT COUNT(*) as cnt FROM nfl_team_stats`)
    
    return NextResponse.json({
      success: true,
      dedup_count: dedupCount.data?.[0]?.cnt,
      final_count: finalCount.data?.[0]?.cnt
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

