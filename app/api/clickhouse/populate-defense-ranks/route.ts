/**
 * Populate Defense Rank Columns in nfl_box_scores_v2
 * 
 * Strategy: Since ClickHouse doesn't support UPDATE with JOIN well,
 * we use a batch approach: get all unique game+opponent+week combinations,
 * join with rankings, then update in batches.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')
  const dryRun = searchParams.get('dry_run') === 'true'
  
  try {
    console.log('[PopulateDefenseRanks] Starting...')
    
    const seasonFilter = season ? `AND b.season = ${season}` : ''
    
    // Count box scores needing update
    const countResult = await clickhouseQuery(`
      SELECT COUNT(*) as total,
             countIf(opp_def_rank_pass_yards = 0) as needs_pass_rank
      FROM nfl_box_scores_v2 b
      WHERE 1=1 ${seasonFilter}
    `)
    
    const counts = countResult.data?.[0] || {}
    console.log('[PopulateDefenseRanks] Box scores:', counts)
    
    // Get unique game/opponent/week combinations with their rankings
    const rankingsResult = await clickhouseQuery(`
      SELECT DISTINCT
        b.season,
        b.week,
        b.opponent_id,
        r.rank_passing_yards_allowed_per_game as pass_rank,
        r.rank_rushing_yards_allowed_per_game as rush_rank,
        r.rank_total_yards_allowed_per_game as rec_rank
      FROM nfl_box_scores_v2 b
      INNER JOIN nfl_team_rankings r ON 
        b.opponent_id = r.team_id 
        AND b.season = r.season 
        AND r.week = b.week - 1
      WHERE b.opp_def_rank_pass_yards = 0 
        AND r.rank_passing_yards_allowed_per_game > 0
        ${seasonFilter}
    `)
    
    const rankings = rankingsResult.data || []
    console.log(`[PopulateDefenseRanks] Found ${rankings.length} unique game/week/opponent combinations`)
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        counts,
        rankings_found: rankings.length,
        sample: rankings.slice(0, 5)
      })
    }
    
    // Update in batches - one UPDATE per unique season/week/opponent combination
    let updated = 0
    for (const ranking of rankings) {
      if (!ranking.pass_rank || ranking.pass_rank === 0) continue
      
      await clickhouseCommand(`
        ALTER TABLE nfl_box_scores_v2 UPDATE
          opp_def_rank_pass_yards = ${ranking.pass_rank},
          opp_def_rank_rush_yards = ${ranking.rush_rank || 0},
          opp_def_rank_receiving_yards = ${ranking.rec_rank || 0}
        WHERE season = ${ranking.season}
          AND week = ${ranking.week}
          AND opponent_id = ${ranking.opponent_id}
          AND opp_def_rank_pass_yards = 0
      `)
      updated++
      
      if (updated % 50 === 0) {
        console.log(`[PopulateDefenseRanks] Updated ${updated}/${rankings.length} combinations`)
      }
    }
    
    // Verify the update
    const verifyResult = await clickhouseQuery(`
      SELECT COUNT(*) as total,
             countIf(opp_def_rank_pass_yards > 0) as has_pass_rank,
             countIf(opp_def_rank_rush_yards > 0) as has_rush_rank,
             countIf(opp_def_rank_receiving_yards > 0) as has_rec_rank
      FROM nfl_box_scores_v2 b
      WHERE 1=1 ${seasonFilter}
    `)
    
    return NextResponse.json({
      success: true,
      message: 'Defense ranks populated',
      combinations_updated: updated,
      before: counts,
      after: verifyResult.data?.[0] || {}
    })
    
  } catch (error: any) {
    console.error('[PopulateDefenseRanks] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Show current status
    const result = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_box_scores,
        countIf(opp_def_rank_pass_yards > 0) as with_pass_rank,
        countIf(opp_def_rank_rush_yards > 0) as with_rush_rank,
        countIf(opp_def_rank_receiving_yards > 0) as with_rec_rank,
        round(countIf(opp_def_rank_pass_yards > 0) / COUNT(*) * 100, 1) as pass_rank_pct
      FROM nfl_box_scores_v2
      GROUP BY season
      ORDER BY season
    `)
    
    return NextResponse.json({
      success: true,
      status: result.data || [],
      note: 'POST to this endpoint to populate defense ranks. Add ?dry_run=true to preview.'
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

