import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

/**
 * CALCULATE NFL TEAM RANKINGS
 * 
 * For a given season/week, calculates rankings based on all games through that week.
 * Teams are ranked 1-32 where lower rank = better performance.
 * 
 * Can be called:
 * - With specific season/week: ?season=2025&week=13
 * - With 'auto' to detect current season/week: ?auto=true
 * - Via cron (Tuesday 8 AM) to update current week
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const autoDetect = searchParams.get('auto') === 'true'
  
  try {
    let seasonNum: number
    let weekNum: number
    
    if (autoDetect || (!searchParams.get('season') && !searchParams.get('week'))) {
      // Auto-detect current season and latest week with data
      const latestData = await clickhouseQuery(`
        SELECT season, max(week) as max_week 
        FROM nfl_team_stats 
        GROUP BY season 
        ORDER BY season DESC 
        LIMIT 1
      `)
      
      if (!latestData.data || latestData.data.length === 0) {
        throw new Error('No team stats data found')
      }
      
      seasonNum = latestData.data[0].season
      weekNum = latestData.data[0].max_week
      console.log(`[Calculate Rankings] Auto-detected: Season ${seasonNum} Week ${weekNum}`)
    } else {
      seasonNum = parseInt(searchParams.get('season') || '2025')
      weekNum = parseInt(searchParams.get('week') || '1')
    }
    
    console.log(`[Calculate Rankings] Starting ${seasonNum} Week ${weekNum}...`)
    
    // Step 1: Delete existing rankings for this season/week
    await clickhouseCommand(`
      ALTER TABLE nfl_team_rankings DELETE 
      WHERE season = ${seasonNum} AND week = ${weekNum}
    `)
    
    // Wait for mutation to complete
    await new Promise(r => setTimeout(r, 1000))
    
    // Step 2: Aggregate team stats through this week including yards per attempt
    const aggregatedStats = await clickhouseQuery(`
      SELECT 
        team_id,
        COUNT(*) as games_played,
        
        -- OFFENSIVE AVERAGES
        AVG(points_scored) as points_per_game,
        AVG(total_yards) as total_yards_per_game,
        AVG(passing_yards) as passing_yards_per_game,
        AVG(rushing_yards) as rushing_yards_per_game,
        
        -- YARDS PER ATTEMPT (efficiency)
        SUM(passing_yards) / nullIf(SUM(passing_attempts), 0) as yards_per_pass,
        SUM(rushing_yards) / nullIf(SUM(rushing_attempts), 0) as yards_per_rush,
        
        -- DEFENSIVE AVERAGES
        AVG(points_allowed) as points_allowed_per_game,
        AVG(def_total_yards_allowed) as total_yards_allowed_per_game,
        AVG(def_passing_yards_allowed) as passing_yards_allowed_per_game,
        AVG(def_rushing_yards_allowed) as rushing_yards_allowed_per_game,
        
        -- DEFENSIVE YARDS PER ATTEMPT (using offensive attempts as proxy)
        SUM(def_passing_yards_allowed) / nullIf(SUM(passing_attempts), 0) as yards_per_pass_allowed,
        SUM(def_rushing_yards_allowed) / nullIf(SUM(rushing_attempts), 0) as yards_per_rush_allowed
        
      FROM nfl_team_stats
      WHERE season = ${seasonNum} AND week <= ${weekNum}
      GROUP BY team_id
      ORDER BY team_id
    `)

    if (!aggregatedStats.data || aggregatedStats.data.length === 0) {
      throw new Error(`No team stats found for season ${seasonNum} week ${weekNum}`)
    }

    console.log(`[Calculate Rankings] Aggregated stats for ${aggregatedStats.data.length} teams`)

    // Step 3: Calculate ranks for each metric
    const teams = aggregatedStats.data
    
    // Offensive metrics (higher = better = lower rank number)
    const offensiveMetrics = [
      'points_per_game', 'total_yards_per_game', 'passing_yards_per_game',
      'rushing_yards_per_game', 'yards_per_pass', 'yards_per_rush'
    ]
    
    // Defensive metrics (lower = better = lower rank number)  
    const defensiveMetrics = [
      'points_allowed_per_game', 'total_yards_allowed_per_game',
      'passing_yards_allowed_per_game', 'rushing_yards_allowed_per_game',
      'yards_per_pass_allowed', 'yards_per_rush_allowed'
    ]
    
    // Calculate ranks
    const ranks: Record<number, Record<string, number>> = {}
    teams.forEach((t: any) => { ranks[t.team_id] = {} })
    
    for (const metric of offensiveMetrics) {
      const sorted = [...teams].sort((a: any, b: any) => (b[metric] || 0) - (a[metric] || 0))
      sorted.forEach((t: any, i: number) => {
        ranks[t.team_id][`rank_${metric}`] = i + 1
      })
    }
    
    for (const metric of defensiveMetrics) {
      const sorted = [...teams].sort((a: any, b: any) => (a[metric] || 999) - (b[metric] || 999))
      sorted.forEach((t: any, i: number) => {
        ranks[t.team_id][`rank_${metric}`] = i + 1
      })
    }

    // Step 4: Insert rankings
    for (const team of teams) {
      const r = ranks[team.team_id]
      
      await clickhouseCommand(`
        INSERT INTO nfl_team_rankings (
          team_id, season, week, games_played,
          rank_points_per_game, rank_total_yards_per_game, 
          rank_passing_yards_per_game, rank_rushing_yards_per_game,
          rank_yards_per_pass, rank_yards_per_rush,
          rank_points_allowed_per_game, rank_total_yards_allowed_per_game,
          rank_passing_yards_allowed_per_game, rank_rushing_yards_allowed_per_game,
          rank_yards_per_pass_allowed, rank_yards_per_rush_allowed,
          points_per_game, points_allowed_per_game,
          total_yards_per_game, total_yards_allowed_per_game,
          passing_yards_per_game, passing_yards_allowed_per_game,
          rushing_yards_per_game, rushing_yards_allowed_per_game,
          yards_per_pass, yards_per_rush,
          yards_per_pass_allowed, yards_per_rush_allowed,
          updated_at
        ) VALUES (
          ${team.team_id}, ${seasonNum}, ${weekNum}, ${team.games_played},
          ${r.rank_points_per_game}, ${r.rank_total_yards_per_game},
          ${r.rank_passing_yards_per_game}, ${r.rank_rushing_yards_per_game},
          ${r.rank_yards_per_pass}, ${r.rank_yards_per_rush},
          ${r.rank_points_allowed_per_game}, ${r.rank_total_yards_allowed_per_game},
          ${r.rank_passing_yards_allowed_per_game}, ${r.rank_rushing_yards_allowed_per_game},
          ${r.rank_yards_per_pass_allowed}, ${r.rank_yards_per_rush_allowed},
          ${team.points_per_game || 0}, ${team.points_allowed_per_game || 0},
          ${team.total_yards_per_game || 0}, ${team.total_yards_allowed_per_game || 0},
          ${team.passing_yards_per_game || 0}, ${team.passing_yards_allowed_per_game || 0},
          ${team.rushing_yards_per_game || 0}, ${team.rushing_yards_allowed_per_game || 0},
          ${team.yards_per_pass || 0}, ${team.yards_per_rush || 0},
          ${team.yards_per_pass_allowed || 0}, ${team.yards_per_rush_allowed || 0},
          now()
        )
      `)
    }
    
    console.log(`[Calculate Rankings] ✅ Inserted rankings for ${teams.length} teams`)

    return NextResponse.json({
      success: true,
      season: seasonNum,
      week: weekNum,
      teams_ranked: teams.length,
      message: `Rankings calculated for ${seasonNum} Week ${weekNum}`
    })

  } catch (error: any) {
    console.error('[Calculate Rankings] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

// POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
