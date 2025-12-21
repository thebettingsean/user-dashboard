/**
 * Check Referee Data Coverage
 * Shows how many games have referee data vs missing it
 */

import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Overall coverage
    const overallQuery = await clickhouseQuery<{
      total_games: number
      games_with_ref: number
      games_missing_ref: number
    }>(`
      SELECT 
        COUNT(*) as total_games,
        countIf(referee_name != '' AND referee_name IS NOT NULL) as games_with_ref,
        countIf(referee_name = '' OR referee_name IS NULL) as games_missing_ref
      FROM nfl_games
      WHERE (home_score > 0 OR away_score > 0)
    `)
    
    // Coverage by season
    const seasonQuery = await clickhouseQuery<{
      season: number
      total: number
      with_ref: number
      missing_ref: number
    }>(`
      SELECT 
        season,
        COUNT(*) as total,
        countIf(referee_name != '' AND referee_name IS NOT NULL) as with_ref,
        countIf(referee_name = '' OR referee_name IS NULL) as missing_ref
      FROM nfl_games
      WHERE (home_score > 0 OR away_score > 0)
      GROUP BY season
      ORDER BY season DESC
    `)
    
    // Recent missing games
    const missingQuery = await clickhouseQuery<{
      espn_game_id: string
      game_date: string
      home_team_name: string
      away_team_name: string
    }>(`
      SELECT 
        espn_game_id,
        toString(game_date) as game_date,
        home_team_name,
        away_team_name
      FROM nfl_games
      WHERE (home_score > 0 OR away_score > 0)
        AND (referee_name = '' OR referee_name IS NULL)
      ORDER BY game_date DESC
      LIMIT 10
    `)
    
    const overall = overallQuery.data?.[0] || { total_games: 0, games_with_ref: 0, games_missing_ref: 0 }
    const coverage = overall.total_games > 0 
      ? ((overall.games_with_ref / overall.total_games) * 100).toFixed(1)
      : '0'
    
    return NextResponse.json({
      success: true,
      overall: {
        total_completed_games: overall.total_games,
        games_with_referee: overall.games_with_ref,
        games_missing_referee: overall.games_missing_ref,
        coverage_percentage: `${coverage}%`
      },
      by_season: seasonQuery.data || [],
      recent_missing_games: missingQuery.data || []
    })
    
  } catch (error: any) {
    console.error('[REFEREE COVERAGE] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

