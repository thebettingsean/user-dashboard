import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Comprehensive NFL Data Summary
 * Shows completion status for all data types across all seasons
 */
export async function GET() {
  try {
    // Games by season
    const gamesResult = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_games,
        SUM(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 ELSE 0 END) as games_with_scores,
        SUM(CASE WHEN spread_open != 0 OR spread_close != 0 OR total_open != 0 OR total_close != 0 THEN 1 ELSE 0 END) as games_with_odds,
        SUM(CASE WHEN referee_name != '' THEN 1 ELSE 0 END) as games_with_referee
      FROM nfl_games
      GROUP BY season
      ORDER BY season
    `)
    
    // Box scores by season
    const boxScoresResult = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(DISTINCT game_id) as games_with_box_scores,
        COUNT(*) as total_player_stats
      FROM nfl_box_scores_v2
      GROUP BY season
      ORDER BY season
    `)
    
    // Team stats by season
    const teamStatsResult = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(DISTINCT game_id) as games_with_team_stats,
        COUNT(*) as total_team_stat_records
      FROM nfl_team_stats
      GROUP BY season
      ORDER BY season
    `)
    
    // Rankings by season
    const rankingsResult = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(DISTINCT week) as weeks_with_rankings,
        COUNT(*) as total_ranking_records
      FROM nfl_team_rankings
      GROUP BY season
      ORDER BY season
    `)
    
    // Combine all data by season
    const seasons = gamesResult.data || []
    const summary = seasons.map((season: any) => {
      const boxScores = (boxScoresResult.data || []).find((b: any) => b.season === season.season)
      const teamStats = (teamStatsResult.data || []).find((t: any) => t.season === season.season)
      const rankings = (rankingsResult.data || []).find((r: any) => r.season === season.season)
      
      return {
        season: season.season,
        games: {
          total: season.total_games,
          with_scores: season.games_with_scores,
          with_odds: season.games_with_odds,
          with_referee: season.games_with_referee,
          scores_pct: Math.round((season.games_with_scores / season.total_games) * 100),
          odds_pct: Math.round((season.games_with_odds / season.total_games) * 100),
          referee_pct: Math.round((season.games_with_referee / season.total_games) * 100)
        },
        box_scores: {
          games_covered: boxScores?.games_with_box_scores || 0,
          total_player_stats: boxScores?.total_player_stats || 0,
          coverage_pct: Math.round(((boxScores?.games_with_box_scores || 0) / season.total_games) * 100)
        },
        team_stats: {
          games_covered: teamStats?.games_with_team_stats || 0,
          total_records: teamStats?.total_team_stat_records || 0,
          coverage_pct: Math.round(((teamStats?.games_with_team_stats || 0) / season.total_games) * 100)
        },
        rankings: {
          weeks: rankings?.weeks_with_rankings || 0,
          total_records: rankings?.total_ranking_records || 0
        }
      }
    })
    
    // Overall totals
    const totals = {
      games: seasons.reduce((sum: number, s: any) => sum + s.total_games, 0),
      games_with_scores: seasons.reduce((sum: number, s: any) => sum + s.games_with_scores, 0),
      games_with_odds: seasons.reduce((sum: number, s: any) => sum + s.games_with_odds, 0),
      games_with_referee: seasons.reduce((sum: number, s: any) => sum + s.games_with_referee, 0),
      total_box_scores: (boxScoresResult.data || []).reduce((sum: number, b: any) => sum + b.total_player_stats, 0),
      total_team_stats: (teamStatsResult.data || []).reduce((sum: number, t: any) => sum + t.total_team_stat_records, 0),
      total_rankings: (rankingsResult.data || []).reduce((sum: number, r: any) => sum + r.total_ranking_records, 0)
    }
    
    return NextResponse.json({
      success: true,
      totals,
      by_season: summary,
      data_quality: {
        scores_complete: totals.games_with_scores === totals.games,
        odds_coverage: Math.round((totals.games_with_odds / totals.games) * 100),
        referee_coverage: Math.round((totals.games_with_referee / totals.games) * 100)
      }
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

