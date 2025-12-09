import { NextResponse } from 'next/server'
import { QueryFilters } from '@/lib/query-engine/types'

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST!
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID!
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET!

async function executeQuery(sql: string): Promise<any> {
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({ query: sql, format: 'JSONEachRow' })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ClickHouse error: ${text}`)
  }

  const text = await response.text()
  if (!text.trim()) return []
  return text.trim().split('\n').map(line => JSON.parse(line))
}

// Map prop stat types to database prop_type values
const PROP_TYPE_MAP: Record<string, string> = {
  'pass_yards': 'player_pass_yds',
  'pass_tds': 'player_pass_tds',
  'pass_attempts': 'player_pass_attempts',
  'pass_completions': 'player_pass_completions',
  'interceptions': 'player_pass_interceptions',
  'rush_yards': 'player_rush_yds',
  'rush_tds': 'player_rush_tds',
  'rush_attempts': 'player_rush_attempts',
  'receiving_yards': 'player_reception_yds',
  'receptions': 'player_receptions',
  'receiving_tds': 'player_reception_tds',
}

// Map positions to relevant prop types
const POSITION_PROP_TYPES: Record<string, string[]> = {
  'qb': ['player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions', 'player_rush_yds'],
  'rb': ['player_rush_yds', 'player_rush_tds', 'player_rush_attempts', 'player_reception_yds', 'player_receptions'],
  'wr': ['player_reception_yds', 'player_receptions', 'player_reception_tds'],
  'te': ['player_reception_yds', 'player_receptions', 'player_reception_tds'],
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      position,        // 'qb', 'rb', 'wr', 'te', 'any'
      stat,            // 'receiving_yards', 'rush_yards', etc.
      line_min,        // minimum line value
      line_max,        // maximum line value
      filters = {}     // game-level filters (total, defense rank, etc.)
    } = body as { 
      position?: string, 
      stat?: string, 
      line_min?: number, 
      line_max?: number,
      filters: QueryFilters 
    }
    
    const gameConditions: string[] = []
    const propConditions: string[] = []
    const appliedFilters: string[] = []
    
    // ===== PROP-SPECIFIC FILTERS =====
    
    // Prop type filter (stat type)
    if (stat && PROP_TYPE_MAP[stat]) {
      propConditions.push(`p.prop_type = '${PROP_TYPE_MAP[stat]}'`)
      appliedFilters.push(stat.replace('_', ' '))
    } else if (position && POSITION_PROP_TYPES[position]) {
      // Filter by position's relevant prop types
      const propTypes = POSITION_PROP_TYPES[position]
      propConditions.push(`p.prop_type IN ('${propTypes.join("','")}')`)
      appliedFilters.push(`${position.toUpperCase()} props`)
    }
    
    // Line range filter
    if (line_min !== undefined && line_min !== null) {
      propConditions.push(`p.line >= ${line_min}`)
    }
    if (line_max !== undefined && line_max !== null) {
      propConditions.push(`p.line <= ${line_max}`)
    }
    if (line_min !== undefined || line_max !== undefined) {
      const lineDesc = line_min && line_max ? `${line_min}-${line_max}` 
        : line_min ? `${line_min}+` : `≤${line_max}`
      appliedFilters.push(`Line: ${lineDesc}`)
    }
    
    // ===== GAME-LEVEL FILTERS =====
    
    // Track if we need player-team filtering (location or favorite filters)
    // These require knowing which team the player is on
    const needsPlayerTeamFilter = filters.location || filters.is_favorite
    
    // Total range
    if (filters.total_range) {
      const { min, max } = filters.total_range
      if (min !== undefined) {
        gameConditions.push(`ll.total_line >= ${min}`)
        appliedFilters.push(`Total ${min}+`)
      }
      if (max !== undefined) {
        gameConditions.push(`ll.total_line <= ${max}`)
        if (min === undefined) appliedFilters.push(`Total ≤${max}`)
      }
    }
    
    // Division filter
    if (filters.is_division_game === true) {
      gameConditions.push('g.is_division_game = 1')
      appliedFilters.push('Division')
    } else if (filters.is_division_game === false) {
      gameConditions.push('g.is_division_game = 0')
      appliedFilters.push('Non-Division')
    }
    
    // Conference filter
    if (filters.is_conference_game === true) {
      gameConditions.push('g.is_conference_game = 1')
      appliedFilters.push('Conference')
    } else if (filters.is_conference_game === false) {
      gameConditions.push('g.is_conference_game = 0')
      appliedFilters.push('Non-Conference')
    }
    
    // Defense rank filter (opponent's defense) - for position-specific
    const defStat = (filters.defense_stat_position || filters.defense_stat) as string
    if (filters.vs_defense_rank && filters.vs_defense_rank !== 'any') {
      // Determine column based on stat type
      let homeCol = 'g.home_defense_rank'
      let awayCol = 'g.away_defense_rank'
      let statLabel = 'Defense'
      
      if (defStat === 'wr' || defStat === 'vs_wr') {
        homeCol = 'g.home_rank_vs_wr'
        awayCol = 'g.away_rank_vs_wr'
        statLabel = 'D vs WRs'
      } else if (defStat === 'te' || defStat === 'vs_te') {
        homeCol = 'g.home_rank_vs_te'
        awayCol = 'g.away_rank_vs_te'
        statLabel = 'D vs TEs'
      } else if (defStat === 'rb' || defStat === 'vs_rb') {
        homeCol = 'g.home_rank_vs_rb'
        awayCol = 'g.away_rank_vs_rb'
        statLabel = 'D vs RBs'
      } else if (defStat === 'pass') {
        homeCol = 'g.home_pass_defense_rank'
        awayCol = 'g.away_pass_defense_rank'
        statLabel = 'Pass D'
      } else if (defStat === 'rush') {
        homeCol = 'g.home_rush_defense_rank'
        awayCol = 'g.away_rush_defense_rank'
        statLabel = 'Rush D'
      }
      
      // We want games where EITHER team has a defense in the rank range
      // (players on home team face away defense, players on away team face home defense)
      let rankCondition = ''
      switch (filters.vs_defense_rank) {
        case 'top_5':
          rankCondition = `((${homeCol} <= 5 AND ${homeCol} > 0) OR (${awayCol} <= 5 AND ${awayCol} > 0))`
          break
        case 'top_10':
          rankCondition = `((${homeCol} <= 10 AND ${homeCol} > 0) OR (${awayCol} <= 10 AND ${awayCol} > 0))`
          break
        case 'top_15':
          rankCondition = `((${homeCol} <= 15 AND ${homeCol} > 0) OR (${awayCol} <= 15 AND ${awayCol} > 0))`
          break
        case 'bottom_5':
          rankCondition = `(${homeCol} >= 28 OR ${awayCol} >= 28)`
          break
        case 'bottom_10':
          rankCondition = `(${homeCol} >= 23 OR ${awayCol} >= 23)`
          break
        case 'bottom_15':
          rankCondition = `(${homeCol} >= 18 OR ${awayCol} >= 18)`
          break
      }
      if (rankCondition) {
        gameConditions.push(rankCondition)
        appliedFilters.push(`vs ${filters.vs_defense_rank.replace('_', ' ')} ${statLabel}`)
      }
    }
    
    // Build WHERE clauses
    const gameWhereClause = gameConditions.length > 0 
      ? 'AND ' + gameConditions.join(' AND ')
      : ''
    const propWhereClause = propConditions.length > 0
      ? 'AND ' + propConditions.join(' AND ')
      : ''
    
    // Always join with players table to get headshot, optionally filter by position
    // Use LEFT JOIN so players not in our table still show up
    // IMPORTANT: Normalize names by removing periods (e.g., "AJ Brown" vs "A.J. Brown")
    const positionJoinClause = `LEFT JOIN players pl ON 
      LOWER(REPLACE(p.player_name, '.', '')) = LOWER(REPLACE(pl.name, '.', '')) 
      AND pl.sport = 'nfl'`
    let positionCondition = ''
    if (position && position !== 'any') {
      // Allow players who ARE the position OR who aren't in our players table (pl.position IS NULL)
      // This ensures we don't miss props just because a player isn't in our database
      positionCondition = `AND (pl.position = '${position.toUpperCase()}' OR pl.position IS NULL)`
    }
    
    // Build line filter condition (to find qualifying players)
    const lineFilterConditions: string[] = []
    if (line_min !== undefined && line_min !== null) {
      lineFilterConditions.push(`line >= ${line_min}`)
    }
    if (line_max !== undefined && line_max !== null) {
      lineFilterConditions.push(`line <= ${line_max}`)
    }
    const lineFilterClause = lineFilterConditions.length > 0 
      ? lineFilterConditions.join(' AND ')
      : '1=1'
    
    // Build player-team filter conditions (location + favorite/underdog)
    // These filter which players show based on their team's home/away status and spread
    let playerTeamCondition = ''
    
    if (filters.location && filters.location !== 'any') {
      if (filters.location === 'home') {
        // Player must be on the HOME team
        playerTeamCondition += ` AND pl.team_id = g.home_team_id`
        appliedFilters.push('Home')
      } else if (filters.location === 'away') {
        // Player must be on the AWAY team
        playerTeamCondition += ` AND pl.team_id = g.away_team_id`
        appliedFilters.push('Away')
      }
    }
    
    if (filters.is_favorite && filters.is_favorite !== 'any') {
      if (filters.is_favorite === 'favorite') {
        // Player's team must be the favorite
        // If player is on home team, home must be favorite (home_spread < 0)
        // If player is on away team, away must be favorite (home_spread > 0)
        if (filters.location === 'home') {
          playerTeamCondition += ` AND ll.home_spread < 0`
        } else if (filters.location === 'away') {
          playerTeamCondition += ` AND ll.home_spread > 0`
        } else {
          // No location specified - favorite from either side
          playerTeamCondition += ` AND ((pl.team_id = g.home_team_id AND ll.home_spread < 0) OR (pl.team_id = g.away_team_id AND ll.home_spread > 0))`
        }
        appliedFilters.push('Favorite')
      } else if (filters.is_favorite === 'underdog') {
        // Player's team must be the underdog
        if (filters.location === 'home') {
          playerTeamCondition += ` AND ll.home_spread > 0`
        } else if (filters.location === 'away') {
          playerTeamCondition += ` AND ll.home_spread < 0`
        } else {
          playerTeamCondition += ` AND ((pl.team_id = g.home_team_id AND ll.home_spread > 0) OR (pl.team_id = g.away_team_id AND ll.home_spread < 0))`
        }
        appliedFilters.push('Underdog')
      }
    }
    
    // Query for upcoming props that match filters
    // First find players with at least one book line in range, then get ALL their book lines
    const sql = `
      WITH latest_lines AS (
        SELECT 
          game_id,
          argMax(home_spread, snapshot_time) as home_spread,
          argMax(total_line, snapshot_time) as total_line,
          argMax(home_ml, snapshot_time) as home_ml,
          argMax(away_ml, snapshot_time) as away_ml,
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
      -- Find player/prop combos that have at least one book line in range
      qualifying_players AS (
        SELECT DISTINCT game_id, player_name, prop_type
        FROM all_latest_props
        WHERE ${lineFilterClause}
        ${propConditions.filter(c => !c.includes('p.line')).length > 0 
          ? 'AND ' + propConditions.filter(c => !c.includes('p.line')).join(' AND ').replace(/p\./g, '')
          : ''}
      )
      SELECT 
        g.game_id AS game_id,
        g.game_time AS game_time,
        g.home_team_id AS home_team_id,
        g.away_team_id AS away_team_id,
        g.home_team_name AS home_team_name,
        g.away_team_name AS away_team_name,
        g.home_team_abbr AS home_team_abbr,
        g.away_team_abbr AS away_team_abbr,
        g.is_division_game AS is_division_game,
        g.is_conference_game AS is_conference_game,
        g.home_rank_vs_wr AS home_rank_vs_wr,
        g.home_rank_vs_te AS home_rank_vs_te,
        g.home_rank_vs_rb AS home_rank_vs_rb,
        g.away_rank_vs_wr AS away_rank_vs_wr,
        g.away_rank_vs_te AS away_rank_vs_te,
        g.away_rank_vs_rb AS away_rank_vs_rb,
        g.home_defense_rank AS home_defense_rank,
        g.away_defense_rank AS away_defense_rank,
        g.home_win_pct AS home_win_pct,
        g.away_win_pct AS away_win_pct,
        ll.total_line AS total_line,
        ll.home_spread AS home_spread,
        p.player_name AS player_name,
        p.prop_type AS prop_type,
        p.line AS prop_line,
        p.over_odds AS over_odds,
        p.under_odds AS under_odds,
        p.bookmaker AS bookmaker,
        -- Flag if this specific line is in the filter range
        IF(${lineFilterClause.replace(/line/g, 'p.line')}, 1, 0) AS in_filter_range,
        pl.headshot_url AS player_headshot,
        pl.espn_player_id AS player_id,
        pl.team_id AS player_team_id,
        -- Is player on home or away team?
        IF(pl.team_id = g.home_team_id, 1, 0) AS is_home_player
      FROM nfl_upcoming_games g
      INNER JOIN latest_lines ll ON g.game_id = ll.game_id
      INNER JOIN qualifying_players qp ON g.game_id = qp.game_id
      INNER JOIN all_latest_props p ON g.game_id = p.game_id 
        AND p.player_name = qp.player_name 
        AND p.prop_type = qp.prop_type
      ${positionJoinClause}
      WHERE 1=1
      ${gameWhereClause}
      ${positionCondition}
      ${playerTeamCondition}
      ORDER BY g.game_time ASC, p.player_name, p.line
    `
    
    console.log('[UpcomingProps] Query:', sql.substring(0, 500) + '...')
    
    const rows = await executeQuery(sql)
    
    // Debug: log unique game_ids in raw results
    const uniqueGameIds = new Set(rows.map((r: any) => r.game_id))
    console.log('[UpcomingProps] Raw rows:', rows.length, 'Unique games:', uniqueGameIds.size)
    if (rows.length > 0) {
      console.log('[UpcomingProps] First row game_id:', rows[0].game_id, 'teams:', rows[0].away_team_abbr, '@', rows[0].home_team_abbr)
    }
    
    // Group by game and player for cleaner response
    const gamesMap = new Map<string, any>()
    
    for (const row of rows) {
      const gameKey = row.game_id
      
      if (!gamesMap.has(gameKey)) {
        gamesMap.set(gameKey, {
          game_id: row.game_id,
          game_time: row.game_time,
          home_team_id: row.home_team_id,
          away_team_id: row.away_team_id,
          home_team_name: row.home_team_name,
          away_team_name: row.away_team_name,
          home_team_abbr: row.home_team_abbr,
          away_team_abbr: row.away_team_abbr,
          is_division_game: row.is_division_game,
          is_conference_game: row.is_conference_game,
          home_rank_vs_wr: row.home_rank_vs_wr,
          home_rank_vs_te: row.home_rank_vs_te,
          home_rank_vs_rb: row.home_rank_vs_rb,
          away_rank_vs_wr: row.away_rank_vs_wr,
          away_rank_vs_te: row.away_rank_vs_te,
          away_rank_vs_rb: row.away_rank_vs_rb,
          home_defense_rank: row.home_defense_rank,
          away_defense_rank: row.away_defense_rank,
          home_win_pct: row.home_win_pct,
          away_win_pct: row.away_win_pct,
          total_line: row.total_line,
          home_spread: row.home_spread,
          props: []
        })
      }
      
      // Add prop to game with in_filter_range flag
      gamesMap.get(gameKey)!.props.push({
        player_name: row.player_name,
        prop_type: row.prop_type,
        line: row.prop_line,
        over_odds: row.over_odds,
        under_odds: row.under_odds,
        bookmaker: row.bookmaker,
        player_headshot: row.player_headshot,
        player_id: row.player_id,
        in_filter_range: row.in_filter_range === 1
      })
    }
    
    const games = Array.from(gamesMap.values())
    
    // Process props: group all book lines per player, select best in-range line for display
    for (const game of games) {
      const playerPropsMap = new Map<string, { primary: any, all_books: any[] }>()
      
      for (const prop of game.props) {
        const key = `${prop.player_name}_${prop.prop_type}`
        
        if (!playerPropsMap.has(key)) {
          playerPropsMap.set(key, { 
            primary: prop.in_filter_range ? prop : null, 
            all_books: [prop] 
          })
        } else {
          const existing = playerPropsMap.get(key)!
          existing.all_books.push(prop)
          
          // Update primary if this one is in range and better (lower line)
          if (prop.in_filter_range) {
            if (!existing.primary || prop.line < existing.primary.line) {
              existing.primary = prop
            }
          }
        }
      }
      
      // Convert to final format with all_books array
      game.props = Array.from(playerPropsMap.values())
        .filter(p => p.primary !== null) // Only include players with at least one in-range line
        .map(p => ({
          ...p.primary,
          all_books: p.all_books.sort((a, b) => a.line - b.line) // Sort by line ascending
        }))
    }
    
    const duration = Date.now() - startTime
    
    // Create a flat list of upcoming props for display
    const upcomingProps: any[] = []
    for (const game of games) {
      for (const prop of game.props) {
        upcomingProps.push({
          game_id: game.game_id,
          game_time: game.game_time,
          home_team_id: game.home_team_id,
          away_team_id: game.away_team_id,
          home_team_abbr: game.home_team_abbr,
          away_team_abbr: game.away_team_abbr,
          home_team_name: game.home_team_name,
          away_team_name: game.away_team_name,
          is_division_game: game.is_division_game,
          is_conference_game: game.is_conference_game,
          home_rank_vs_wr: game.home_rank_vs_wr,
          home_rank_vs_te: game.home_rank_vs_te,
          home_rank_vs_rb: game.home_rank_vs_rb,
          away_rank_vs_wr: game.away_rank_vs_wr,
          away_rank_vs_te: game.away_rank_vs_te,
          away_rank_vs_rb: game.away_rank_vs_rb,
          total_line: game.total_line,
          home_spread: game.home_spread,
          player_name: prop.player_name,
          prop_type: prop.prop_type,
          line: prop.line,
          over_odds: prop.over_odds,
          under_odds: prop.under_odds,
          bookmaker: prop.bookmaker,
          player_headshot: prop.player_headshot,
          player_id: prop.player_id,
          all_books: prop.all_books || [] // Include all sportsbook lines
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      games,
      upcoming_props: upcomingProps,
      total_games: games.length,
      total_props: upcomingProps.length,
      applied_filters: appliedFilters,
      duration_ms: duration
    })

  } catch (error) {
    console.error('Upcoming props error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

