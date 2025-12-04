import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseInsert } from '@/lib/clickhouse'

/**
 * CALCULATE NFL TEAM RANKINGS
 * 
 * For a given season/week, calculates rankings based on all games through that week.
 * Teams are ranked 1-32 where lower = better performance.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2022'
  const week = searchParams.get('week') || '1'
  
  try {
    console.log(`[Calculate Rankings] Starting ${season} Week ${week}...`)
    
    // Step 1: Aggregate team stats through this week
    const aggregatedStats = await clickhouseQuery(`
      SELECT 
        team_id,
        ${season} as season,
        ${week} as week,
        COUNT(*) as games_played,
        
        -- OFFENSIVE AVERAGES
        AVG(points_scored) as points_per_game,
        AVG(total_yards) as total_yards_per_game,
        AVG(passing_yards) as passing_yards_per_game,
        AVG(rushing_yards) as rushing_yards_per_game,
        AVG(third_down_pct) as third_down_pct_avg,
        AVG(redzone_pct) as redzone_pct_avg,
        
        -- DEFENSIVE AVERAGES
        AVG(points_allowed) as points_allowed_per_game,
        AVG(def_total_yards_allowed) as total_yards_allowed_per_game,
        AVG(def_passing_yards_allowed) as passing_yards_allowed_per_game,
        AVG(def_rushing_yards_allowed) as rushing_yards_allowed_per_game,
        AVG(def_sacks) as sacks_per_game,
        AVG(def_turnovers_forced) as turnovers_forced_per_game
        
      FROM nfl_team_stats
      WHERE season = ${season} AND week <= ${week}
      GROUP BY team_id
      ORDER BY team_id
    `)

    if (!aggregatedStats.data || aggregatedStats.data.length === 0) {
      throw new Error('No team stats found for this season/week')
    }

    console.log(`[Calculate Rankings] Aggregated stats for ${aggregatedStats.data.length} teams`)

    // Step 2: Rank teams for each metric
    const rankedTeams = rankTeams(aggregatedStats.data, season, week)

    // Step 3: Insert into nfl_team_rankings
    if (rankedTeams.length > 0) {
      await clickhouseInsert('nfl_team_rankings', rankedTeams)
      console.log(`[Calculate Rankings] ✅ Inserted rankings for ${rankedTeams.length} teams`)
    }

    return NextResponse.json({
      success: true,
      season: parseInt(season),
      week: parseInt(week),
      teams_ranked: rankedTeams.length
    })

  } catch (error: any) {
    console.error('[Calculate Rankings] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        season: parseInt(season),
        week: parseInt(week)
      },
      { status: 500 }
    )
  }
}

// Rank teams for all metrics
function rankTeams(teams: any[], season: string, week: string) {
  // Sort and rank for each metric
  const rankedData = teams.map((team: any) => {
    return {
      team_id: team.team_id,
      season: parseInt(season),
      week: parseInt(week),
      games_played: team.games_played,
      
      // Will be calculated below
      rank_points_per_game: 0,
      rank_total_yards_per_game: 0,
      rank_passing_yards_per_game: 0,
      rank_rushing_yards_per_game: 0,
      rank_third_down_pct: 0,
      rank_redzone_pct: 0,
      
      rank_points_allowed_per_game: 0,
      rank_total_yards_allowed_per_game: 0,
      rank_passing_yards_allowed_per_game: 0,
      rank_rushing_yards_allowed_per_game: 0,
      rank_sacks_per_game: 0,
      rank_turnovers_forced_per_game: 0,
      
      // Actual values
      points_per_game: team.points_per_game,
      points_allowed_per_game: team.points_allowed_per_game,
      total_yards_per_game: team.total_yards_per_game,
      total_yards_allowed_per_game: team.total_yards_allowed_per_game,
      passing_yards_per_game: team.passing_yards_per_game,
      passing_yards_allowed_per_game: team.passing_yards_allowed_per_game,
      rushing_yards_per_game: team.rushing_yards_per_game,
      rushing_yards_allowed_per_game: team.rushing_yards_allowed_per_game,
      
      updated_at: Math.floor(Date.now() / 1000)
    }
  })

  // Rank offensive stats (higher = better rank, so rank 1 = highest value)
  rankByValue(rankedData, 'points_per_game', 'rank_points_per_game', false)
  rankByValue(rankedData, 'total_yards_per_game', 'rank_total_yards_per_game', false)
  rankByValue(rankedData, 'passing_yards_per_game', 'rank_passing_yards_per_game', false)
  rankByValue(rankedData, 'rushing_yards_per_game', 'rank_rushing_yards_per_game', false)

  // Rank defensive stats (lower = better rank, so rank 1 = lowest value)
  rankByValue(rankedData, 'points_allowed_per_game', 'rank_points_allowed_per_game', true)
  rankByValue(rankedData, 'total_yards_allowed_per_game', 'rank_total_yards_allowed_per_game', true)
  rankByValue(rankedData, 'passing_yards_allowed_per_game', 'rank_passing_yards_allowed_per_game', true)
  rankByValue(rankedData, 'rushing_yards_allowed_per_game', 'rank_rushing_yards_allowed_per_game', true)

  return rankedData
}

// Helper: Rank teams by a specific value
function rankByValue(teams: any[], valueKey: string, rankKey: string, ascending: boolean) {
  // Sort teams by value
  const sorted = [...teams].sort((a, b) => {
    if (ascending) {
      return a[valueKey] - b[valueKey] // Lower is better
    } else {
      return b[valueKey] - a[valueKey] // Higher is better
    }
  })

  // Assign ranks
  sorted.forEach((team, index) => {
    const teamInArray = teams.find(t => t.team_id === team.team_id)
    if (teamInArray) {
      teamInArray[rankKey] = index + 1 // Rank 1-32
    }
  })
}

