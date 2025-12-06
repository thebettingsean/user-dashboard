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

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { 
      query_type = 'trends',
      filters = {},
      bet_type = 'spread'
    } = body as { query_type: string, filters: QueryFilters, bet_type: string }
    
    // Build filter conditions
    const conditions: string[] = []
    const appliedFilters: string[] = []
    
    // ===== MATCHUP FILTERS =====
    
    // Location filter (home/away perspective)
    if (filters.location === 'home') {
      // When filtering for "home" perspective, we look at home team's context
      appliedFilters.push('Home')
    } else if (filters.location === 'away') {
      appliedFilters.push('Away')
    }
    
    // Division game
    if (filters.is_division_game === true) {
      conditions.push('g.is_division_game = 1')
      appliedFilters.push('Division Game')
    } else if (filters.is_division_game === false) {
      conditions.push('g.is_division_game = 0')
      appliedFilters.push('Non-Division')
    }
    
    // Conference game
    if (filters.is_conference_game === true) {
      conditions.push('g.is_conference_game = 1')
      appliedFilters.push('Conference Game')
    } else if (filters.is_conference_game === false) {
      conditions.push('g.is_conference_game = 0')
      appliedFilters.push('Non-Conference')
    }
    
    // ===== BETTING FILTERS (from latest lines - alias 'll') =====
    
    const isHome = filters.location !== 'away'
    const teamPrefix = isHome ? 'home' : 'away'
    const oppPrefix = isHome ? 'away' : 'home'
    
    // Favorite/Dog filter (for spread/ML - based on location)
    if (filters.is_favorite === true) {
      conditions.push(`ll.${teamPrefix}_spread < 0`)
      appliedFilters.push('Favorite')
    } else if (filters.is_favorite === false) {
      conditions.push(`ll.${teamPrefix}_spread > 0`)
      appliedFilters.push('Underdog')
    }
    
    // Home Favorite/Dog filter (for O/U - always from home perspective)
    if (filters.is_home_favorite === true) {
      conditions.push(`ll.home_spread < 0`)
      appliedFilters.push('Home Favorite')
    } else if (filters.is_home_favorite === false) {
      conditions.push(`ll.home_spread > 0`)
      appliedFilters.push('Home Underdog')
    }
    
    // Spread range
    if (filters.spread_range) {
      const { min, max } = filters.spread_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`ll.${teamPrefix}_spread BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Spread ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`ll.${teamPrefix}_spread >= ${min}`)
        appliedFilters.push(`Spread ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`ll.${teamPrefix}_spread <= ${max}`)
        appliedFilters.push(`Spread ≤${max}`)
      }
    }
    
    // Total range
    if (filters.total_range) {
      const { min, max } = filters.total_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`ll.total_line BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Total ${min}-${max}`)
      } else if (min !== undefined) {
        conditions.push(`ll.total_line >= ${min}`)
        appliedFilters.push(`Total ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`ll.total_line <= ${max}`)
        appliedFilters.push(`Total ≤${max}`)
      }
    }
    
    // ML range
    if (filters.ml_range) {
      const { min, max } = filters.ml_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`ll.${teamPrefix}_ml BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`ML ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`ll.${teamPrefix}_ml >= ${min}`)
        appliedFilters.push(`ML ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`ll.${teamPrefix}_ml <= ${max}`)
        appliedFilters.push(`ML ≤${max}`)
      }
    }
    
    // ===== LINE MOVEMENT FILTERS =====
    
    // Spread movement (ll = latest lines, ol = opening lines)
    if (filters.spread_movement_range) {
      const { min, max } = filters.spread_movement_range
      
      if (min !== undefined && max !== undefined) {
        conditions.push(`(ll.home_spread - ol.opening_spread) BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Spread Move ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`(ll.home_spread - ol.opening_spread) >= ${min}`)
        appliedFilters.push(`Spread Move ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`(ll.home_spread - ol.opening_spread) <= ${max}`)
        appliedFilters.push(`Spread Move ≤${max}`)
      }
    }
    
    // Total movement
    if (filters.total_movement_range) {
      const { min, max } = filters.total_movement_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`(ll.total_line - ol.opening_total) BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Total Move ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`(ll.total_line - ol.opening_total) >= ${min}`)
        appliedFilters.push(`Total Move ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`(ll.total_line - ol.opening_total) <= ${max}`)
        appliedFilters.push(`Total Move ≤${max}`)
      }
    }
    
    // ===== TEAM STATS FILTERS =====
    
    // Team's own offense rank
    if (filters.own_offense_rank && filters.own_offense_rank !== 'any') {
      const col = `g.${teamPrefix}_offense_rank`
      switch (filters.own_offense_rank) {
        case 'top_5': conditions.push(`${col} <= 5 AND ${col} > 0`); break
        case 'top_10': conditions.push(`${col} <= 10 AND ${col} > 0`); break
        case 'top_15': conditions.push(`${col} <= 15 AND ${col} > 0`); break
        case 'bottom_5': conditions.push(`${col} >= 28`); break
        case 'bottom_10': conditions.push(`${col} >= 23`); break
        case 'bottom_15': conditions.push(`${col} >= 18`); break
      }
      appliedFilters.push(`Team ${filters.own_offense_rank.replace('_', ' ')} Offense`)
    }
    
    // Team's own defense rank
    if (filters.own_defense_rank && filters.own_defense_rank !== 'any') {
      const col = `g.${teamPrefix}_defense_rank`
      switch (filters.own_defense_rank) {
        case 'top_5': conditions.push(`${col} <= 5 AND ${col} > 0`); break
        case 'top_10': conditions.push(`${col} <= 10 AND ${col} > 0`); break
        case 'top_15': conditions.push(`${col} <= 15 AND ${col} > 0`); break
        case 'bottom_5': conditions.push(`${col} >= 28`); break
        case 'bottom_10': conditions.push(`${col} >= 23`); break
        case 'bottom_15': conditions.push(`${col} >= 18`); break
      }
      appliedFilters.push(`Team ${filters.own_defense_rank.replace('_', ' ')} Defense`)
    }
    
    // vs Offense (opponent's offense rank)
    if (filters.vs_offense_rank && filters.vs_offense_rank !== 'any') {
      const col = `g.${oppPrefix}_offense_rank`
      switch (filters.vs_offense_rank) {
        case 'top_5': conditions.push(`${col} <= 5 AND ${col} > 0`); break
        case 'top_10': conditions.push(`${col} <= 10 AND ${col} > 0`); break
        case 'top_15': conditions.push(`${col} <= 15 AND ${col} > 0`); break
        case 'bottom_5': conditions.push(`${col} >= 28`); break
        case 'bottom_10': conditions.push(`${col} >= 23`); break
        case 'bottom_15': conditions.push(`${col} >= 18`); break
      }
      appliedFilters.push(`vs ${filters.vs_offense_rank.replace('_', ' ')} Offense`)
    }
    
    // vs Defense (opponent's defense rank)
    if (filters.vs_defense_rank && filters.vs_defense_rank !== 'any') {
      const col = `g.${oppPrefix}_defense_rank`
      switch (filters.vs_defense_rank) {
        case 'top_5': conditions.push(`${col} <= 5 AND ${col} > 0`); break
        case 'top_10': conditions.push(`${col} <= 10 AND ${col} > 0`); break
        case 'top_15': conditions.push(`${col} <= 15 AND ${col} > 0`); break
        case 'bottom_5': conditions.push(`${col} >= 28`); break
        case 'bottom_10': conditions.push(`${col} >= 23`); break
        case 'bottom_15': conditions.push(`${col} >= 18`); break
      }
      appliedFilters.push(`vs ${filters.vs_defense_rank.replace('_', ' ')} Defense`)
    }
    
    // ===== MOMENTUM FILTERS =====
    
    // Streak filter
    if (filters.streak !== undefined && filters.streak !== 0) {
      const col = `g.${teamPrefix}_streak`
      if (filters.streak > 0) {
        conditions.push(`${col} >= ${filters.streak}`)
        appliedFilters.push(`On ${filters.streak}+ game win streak`)
      } else {
        conditions.push(`${col} <= ${filters.streak}`)
        appliedFilters.push(`On ${Math.abs(filters.streak)}+ game losing streak`)
      }
    }
    
    // Previous game margin
    if (filters.prev_margin_range) {
      const { min, max } = filters.prev_margin_range
      const col = `g.${teamPrefix}_prev_margin`
      if (min !== undefined && max !== undefined) {
        conditions.push(`${col} BETWEEN ${min} AND ${max}`)
        if (min >= 0) {
          appliedFilters.push(`Won prev by ${min}-${max}`)
        } else if (max <= 0) {
          appliedFilters.push(`Lost prev by ${Math.abs(max)}-${Math.abs(min)}`)
        }
      } else if (min !== undefined) {
        conditions.push(`${col} >= ${min}`)
        appliedFilters.push(min >= 0 ? `Won prev by ${min}+` : `Lost prev by ≤${Math.abs(min)}`)
      } else if (max !== undefined) {
        conditions.push(`${col} <= ${max}`)
        appliedFilters.push(max >= 0 ? `Won prev by ≤${max}` : `Lost prev by ${Math.abs(max)}+`)
      }
    }
    
    // ===== TEAM FILTER =====
    if (filters.team_id) {
      if (filters.location === 'home') {
        conditions.push(`g.home_team_id = ${filters.team_id}`)
      } else if (filters.location === 'away') {
        conditions.push(`g.away_team_id = ${filters.team_id}`)
      } else {
        conditions.push(`(g.home_team_id = ${filters.team_id} OR g.away_team_id = ${filters.team_id})`)
      }
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 
      ? 'AND ' + conditions.join(' AND ')
      : ''
    
    // Query for upcoming games with current lines
    // Using argMax to get latest snapshot per game/bookmaker
    const sql = `
      WITH latest_lines AS (
        SELECT 
          game_id,
          bookmaker,
          argMax(bookmaker_title, snapshot_time) as bookmaker_title,
          argMax(home_spread, snapshot_time) as home_spread,
          argMax(home_spread_odds, snapshot_time) as home_spread_odds,
          argMax(away_spread, snapshot_time) as away_spread,
          argMax(away_spread_odds, snapshot_time) as away_spread_odds,
          argMax(total_line, snapshot_time) as total_line,
          argMax(over_odds, snapshot_time) as over_odds,
          argMax(under_odds, snapshot_time) as under_odds,
          argMax(home_ml, snapshot_time) as home_ml,
          argMax(away_ml, snapshot_time) as away_ml,
          max(snapshot_time) as latest_snapshot
        FROM nfl_line_snapshots
        GROUP BY game_id, bookmaker
      ),
      opening_lines AS (
        SELECT 
          game_id,
          bookmaker,
          home_spread as opening_spread,
          total_line as opening_total,
          home_ml as opening_home_ml,
          away_ml as opening_away_ml
        FROM nfl_line_snapshots
        WHERE is_opening = 1
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
        g.home_offense_rank AS home_offense_rank,
        g.home_defense_rank AS home_defense_rank,
        g.away_offense_rank AS away_offense_rank,
        g.away_defense_rank AS away_defense_rank,
        g.home_streak AS home_streak,
        g.away_streak AS away_streak,
        g.home_prev_margin AS home_prev_margin,
        g.away_prev_margin AS away_prev_margin,
        ht.division AS home_division,
        ht.conference AS home_conference,
        at.division AS away_division,
        at.conference AS away_conference,
        ll.bookmaker AS bookmaker,
        ll.bookmaker_title AS bookmaker_title,
        ll.home_spread AS home_spread,
        ll.home_spread_odds AS home_spread_odds,
        ll.away_spread AS away_spread,
        ll.away_spread_odds AS away_spread_odds,
        ll.total_line AS total_line,
        ll.over_odds AS over_odds,
        ll.under_odds AS under_odds,
        ll.home_ml AS home_ml,
        ll.away_ml AS away_ml,
        ll.latest_snapshot AS snapshot_time,
        ol.opening_spread AS opening_spread,
        ol.opening_total AS opening_total,
        ol.opening_home_ml AS opening_home_ml,
        ol.opening_away_ml AS opening_away_ml
      FROM nfl_upcoming_games g
      INNER JOIN latest_lines ll ON g.game_id = ll.game_id
      LEFT JOIN opening_lines ol ON g.game_id = ol.game_id AND ll.bookmaker = ol.bookmaker
      LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      WHERE 1=1
      ${whereClause}
      ORDER BY g.game_time ASC, ll.bookmaker
    `
    
    const results = await executeQuery(sql)
    
    // Group results by game, with books that match the filters
    const gameMap = new Map<string, any>()
    
    for (const row of results) {
      if (!gameMap.has(row.game_id)) {
        gameMap.set(row.game_id, {
          game_id: row.game_id,
          game_time: row.game_time,
          home_team: {
            id: row.home_team_id,
            name: row.home_team_name,
            abbr: row.home_team_abbr,
            offense_rank: row.home_offense_rank,
            defense_rank: row.home_defense_rank,
            streak: row.home_streak,
            prev_margin: row.home_prev_margin,
            division: row.home_division,
            conference: row.home_conference
          },
          away_team: {
            id: row.away_team_id,
            name: row.away_team_name,
            abbr: row.away_team_abbr,
            offense_rank: row.away_offense_rank,
            defense_rank: row.away_defense_rank,
            streak: row.away_streak,
            prev_margin: row.away_prev_margin,
            division: row.away_division,
            conference: row.away_conference
          },
          is_division_game: row.is_division_game === 1,
          is_conference_game: row.is_conference_game === 1,
          books: []
        })
      }
      
      // Only add if this bookmaker isn't already in the list (deduplicate)
      const existingBooks = gameMap.get(row.game_id).books
      const alreadyHasBookmaker = existingBooks.some((b: any) => b.bookmaker_title === row.bookmaker_title)
      
      if (!alreadyHasBookmaker) {
        // Calculate movements
        const spreadMovement = row.opening_spread ? row.home_spread - row.opening_spread : 0
        const totalMovement = row.opening_total ? row.total_line - row.opening_total : 0
        const mlMovement = row.opening_home_ml ? row.home_ml - row.opening_home_ml : 0
        
        existingBooks.push({
          bookmaker: row.bookmaker,
          bookmaker_title: row.bookmaker_title,
          spread: {
            home: row.home_spread,
            home_odds: row.home_spread_odds,
            away: row.away_spread,
            away_odds: row.away_spread_odds,
            opening: row.opening_spread,
            movement: spreadMovement
          },
          total: {
            line: row.total_line,
            over_odds: row.over_odds,
            under_odds: row.under_odds,
            opening: row.opening_total,
            movement: totalMovement
          },
          moneyline: {
            home: row.home_ml,
            away: row.away_ml,
            opening_home: row.opening_home_ml,
            opening_away: row.opening_away_ml,
            home_movement: mlMovement
          }
        })
      }
    }
    
    // Book priority cascade for sorting
    const BOOK_PRIORITY = [
      'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'caesars', 'betrivers',
      'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
    ]
    
    // Sort books by priority for each game
    const games = Array.from(gameMap.values()).map(game => ({
      ...game,
      books: game.books.sort((a: any, b: any) => {
        const aIdx = BOOK_PRIORITY.findIndex(p => a.bookmaker?.toLowerCase().includes(p))
        const bIdx = BOOK_PRIORITY.findIndex(p => b.bookmaker?.toLowerCase().includes(p))
        const aPriority = aIdx === -1 ? 999 : aIdx
        const bPriority = bIdx === -1 ? 999 : bIdx
        return aPriority - bPriority
      })
    }))
    
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      query_type,
      bet_type,
      filters: appliedFilters,
      upcoming_games: games,
      total_games: games.length,
      total_book_options: results.length,
      query_time_ms: duration
    })
    
  } catch (error) {
    console.error('Upcoming query error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

