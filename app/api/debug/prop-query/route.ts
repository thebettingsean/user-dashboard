import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'
import { executePropQuery } from '@/lib/query-engine/prop-query'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const testQuery = searchParams.get('test') === 'true'
  
  try {
    // If testQuery, run the actual prop query with debug
    if (testQuery) {
      // Test a direct SQL query that mimics the prop query
      const testSql = `
        SELECT DISTINCT
          b.game_id,
          b.player_id,
          toString(b.game_date) as game_date,
          b.rush_yards as stat_value,
          p.name as player_name,
          p.position as player_position
        FROM nfl_box_scores_v2 b
        JOIN nfl_games g ON b.game_id = g.game_id
        JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
        LEFT JOIN nfl_team_rankings opp_rank ON b.opponent_id = opp_rank.team_id 
          AND g.season = opp_rank.season 
          AND g.week = opp_rank.week + 1
        LEFT JOIN nfl_team_rankings team_rank ON b.team_id = team_rank.team_id 
          AND g.season = team_rank.season 
          AND g.week = team_rank.week + 1
        WHERE p.position = 'RB' 
          AND g.season >= 2023
          AND b.pass_yards < 1000
          AND b.rush_yards < 500
          AND b.receiving_yards < 500
        ORDER BY b.game_date DESC
        LIMIT 10
      `
      
      const directResult = await clickhouseQuery(testSql)
      
      // Also try the actual executePropQuery
      const result = await executePropQuery({
        position: 'rb',
        stat: 'rush_yards',
        line: 50,
        filters: {
          time_period: 'since_2023'
        }
      })
      
      return NextResponse.json({
        direct_query_count: directResult.data?.length || 0,
        direct_query_sample: directResult.data?.slice(0, 3),
        prop_query_games: result.games?.length || 0,
        prop_query_filters: result.filters_applied,
        prop_query_debug: (result as any)._debug
      })
    }
    // Test 1: Check box scores data
    const boxScores = await clickhouseQuery(`
      SELECT count(*) as cnt, countDistinct(player_id) as players 
      FROM nfl_box_scores_v2 
      WHERE season >= 2023
    `)
    
    // Test 2: Check players table
    const players = await clickhouseQuery(`
      SELECT count(*) as cnt 
      FROM players 
      WHERE sport = 'nfl' AND position IN ('RB', 'WR', 'QB', 'TE')
    `)
    
    // Test 3: Sample RB box scores
    const sampleRB = await clickhouseQuery(`
      SELECT 
        b.player_id,
        b.rush_yards,
        b.game_date,
        p.name,
        p.position
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
      WHERE p.position = 'RB' AND b.season >= 2023 AND b.rush_yards > 0
      ORDER BY b.game_date DESC
      LIMIT 5
    `)
    
    // Test 4: Check rankings join
    const rankingsJoin = await clickhouseQuery(`
      SELECT 
        count(*) as cnt
      FROM nfl_box_scores_v2 b
      JOIN nfl_games g ON b.game_id = g.game_id
      JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
      LEFT JOIN nfl_team_rankings opp_rank ON b.opponent_id = opp_rank.team_id 
        AND g.season = opp_rank.season 
        AND g.week = opp_rank.week + 1
      LEFT JOIN nfl_team_rankings team_rank ON b.team_id = team_rank.team_id 
        AND g.season = team_rank.season 
        AND g.week = team_rank.week + 1
      WHERE p.position = 'RB' AND g.season >= 2023
    `)
    
    // Test 5: Simple query without rankings
    const simpleQuery = await clickhouseQuery(`
      SELECT DISTINCT
        b.game_id,
        b.player_id,
        toString(b.game_date) as game_date,
        b.rush_yards as stat_value,
        p.name as player_name,
        p.position as player_position
      FROM nfl_box_scores_v2 b
      JOIN nfl_games g ON b.game_id = g.game_id
      JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
      WHERE p.position = 'RB' 
        AND g.season >= 2023
        AND b.rush_yards < 500
      ORDER BY b.game_date DESC
      LIMIT 10
    `)

    return NextResponse.json({
      box_scores_count: boxScores.data[0]?.cnt,
      unique_players: boxScores.data[0]?.players,
      nfl_players_count: players.data[0]?.cnt,
      sample_rb_data: sampleRB.data,
      rankings_join_count: rankingsJoin.data[0]?.cnt,
      simple_query_results: simpleQuery.data.length,
      simple_query_sample: simpleQuery.data.slice(0, 3)
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

