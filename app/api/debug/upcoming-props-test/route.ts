import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const results: any = {}
    
    // 1. Check upcoming games
    const games = await clickhouseQuery(`
      SELECT game_id, game_time, home_team_abbr, away_team_abbr
      FROM nfl_upcoming_games 
      WHERE game_time > now()
      ORDER BY game_time
      LIMIT 10
    `)
    results.upcoming_games = {
      count: games.data.length,
      games: games.data
    }
    
    // 2. Check prop snapshots for these games
    const propCount = await clickhouseQuery(`
      SELECT 
        prop_type,
        count() as cnt,
        countDistinct(player_name) as unique_players,
        min(line) as min_line,
        max(line) as max_line
      FROM nfl_prop_line_snapshots
      WHERE game_id IN (SELECT game_id FROM nfl_upcoming_games WHERE game_time > now())
      GROUP BY prop_type
      ORDER BY cnt DESC
    `)
    results.prop_types = propCount.data
    
    // 3. Check specific WR receiving yards props with line 15-30
    const wrProps = await clickhouseQuery(`
      WITH latest AS (
        SELECT 
          game_id, player_name, prop_type, bookmaker,
          argMax(line, snapshot_time) as line,
          max(snapshot_time) as latest
        FROM nfl_prop_line_snapshots
        WHERE game_id IN (SELECT game_id FROM nfl_upcoming_games WHERE game_time > now())
          AND prop_type = 'player_reception_yds'
        GROUP BY game_id, player_name, prop_type, bookmaker
      )
      SELECT DISTINCT player_name, line
      FROM latest
      WHERE line >= 15 AND line <= 30
      ORDER BY player_name
      LIMIT 30
    `)
    results.receiving_props_15_30 = {
      count: wrProps.data.length,
      props: wrProps.data
    }
    
    // 4. Check players table positions
    const positions = await clickhouseQuery(`
      SELECT position, count() as cnt
      FROM players
      WHERE sport = 'nfl'
      GROUP BY position
      ORDER BY cnt DESC
    `)
    results.player_positions = positions.data
    
    // 5. Check name matching between props and players table
    const matchCheck = await clickhouseQuery(`
      SELECT 
        p.player_name as prop_player,
        pl.name as db_player,
        pl.position,
        pl.team_id
      FROM (
        SELECT DISTINCT player_name
        FROM nfl_prop_line_snapshots
        WHERE game_id IN (SELECT game_id FROM nfl_upcoming_games WHERE game_time > now())
          AND prop_type = 'player_reception_yds'
        LIMIT 15
      ) p
      LEFT JOIN players pl ON LOWER(REPLACE(p.player_name, '.', '')) = LOWER(REPLACE(pl.name, '.', ''))
        AND pl.sport = 'nfl'
    `)
    results.name_matching = matchCheck.data
    
    // 6. Simulate the actual query to see where it breaks
    const simulateQuery = await clickhouseQuery(`
      WITH latest_lines AS (
        SELECT 
          game_id,
          argMax(home_spread, snapshot_time) as home_spread,
          argMax(total_line, snapshot_time) as total_line,
          max(snapshot_time) as latest_snapshot
        FROM nfl_line_snapshots
        GROUP BY game_id
      ),
      all_latest_props AS (
        SELECT 
          game_id,
          player_name,
          prop_type,
          bookmaker,
          argMax(line, snapshot_time) as line,
          argMax(over_odds, snapshot_time) as over_odds,
          argMax(under_odds, snapshot_time) as under_odds,
          max(snapshot_time) as latest_snapshot
        FROM nfl_prop_line_snapshots
        GROUP BY game_id, player_name, prop_type, bookmaker
      ),
      qualifying_players AS (
        SELECT DISTINCT game_id, player_name, prop_type
        FROM all_latest_props
        WHERE line >= 15 AND line <= 30
          AND prop_type = 'player_reception_yds'
      )
      SELECT 
        count() as total_rows,
        countDistinct(p.player_name) as unique_players,
        countDistinct(g.game_id) as unique_games
      FROM nfl_upcoming_games g
      INNER JOIN latest_lines ll ON g.game_id = ll.game_id
      INNER JOIN qualifying_players qp ON g.game_id = qp.game_id
      INNER JOIN all_latest_props p ON g.game_id = p.game_id 
        AND p.player_name = qp.player_name 
        AND p.prop_type = qp.prop_type
      LEFT JOIN players pl ON LOWER(REPLACE(p.player_name, '.', '')) = LOWER(REPLACE(pl.name, '.', '')) 
        AND pl.sport = 'nfl'
      WHERE g.game_time > now()
    `)
    results.simulated_query_no_position = simulateQuery.data[0]
    
    // 7. Same query but with WR position filter
    const withPositionFilter = await clickhouseQuery(`
      WITH latest_lines AS (
        SELECT 
          game_id,
          argMax(home_spread, snapshot_time) as home_spread,
          argMax(total_line, snapshot_time) as total_line,
          max(snapshot_time) as latest_snapshot
        FROM nfl_line_snapshots
        GROUP BY game_id
      ),
      all_latest_props AS (
        SELECT 
          game_id,
          player_name,
          prop_type,
          bookmaker,
          argMax(line, snapshot_time) as line,
          argMax(over_odds, snapshot_time) as over_odds,
          argMax(under_odds, snapshot_time) as under_odds,
          max(snapshot_time) as latest_snapshot
        FROM nfl_prop_line_snapshots
        GROUP BY game_id, player_name, prop_type, bookmaker
      ),
      qualifying_players AS (
        SELECT DISTINCT game_id, player_name, prop_type
        FROM all_latest_props
        WHERE line >= 15 AND line <= 30
          AND prop_type = 'player_reception_yds'
      )
      SELECT 
        count() as total_rows,
        countDistinct(p.player_name) as unique_players,
        countDistinct(g.game_id) as unique_games
      FROM nfl_upcoming_games g
      INNER JOIN latest_lines ll ON g.game_id = ll.game_id
      INNER JOIN qualifying_players qp ON g.game_id = qp.game_id
      INNER JOIN all_latest_props p ON g.game_id = p.game_id 
        AND p.player_name = qp.player_name 
        AND p.prop_type = qp.prop_type
      LEFT JOIN players pl ON LOWER(REPLACE(p.player_name, '.', '')) = LOWER(REPLACE(pl.name, '.', '')) 
        AND pl.sport = 'nfl'
      WHERE g.game_time > now()
        AND (pl.position = 'WR' OR pl.position IS NULL)
    `)
    results.simulated_query_with_wr_filter = withPositionFilter.data[0]
    
    // 8. Check what positions are assigned to receiving props players
    const propsPlayerPositions = await clickhouseQuery(`
      SELECT 
        pl.position,
        count() as cnt
      FROM (
        SELECT DISTINCT player_name
        FROM nfl_prop_line_snapshots
        WHERE game_id IN (SELECT game_id FROM nfl_upcoming_games WHERE game_time > now())
          AND prop_type = 'player_reception_yds'
      ) p
      LEFT JOIN players pl ON LOWER(REPLACE(p.player_name, '.', '')) = LOWER(REPLACE(pl.name, '.', ''))
        AND pl.sport = 'nfl'
      GROUP BY pl.position
      ORDER BY cnt DESC
    `)
    results.receiving_props_player_positions = propsPlayerPositions.data
    
    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

