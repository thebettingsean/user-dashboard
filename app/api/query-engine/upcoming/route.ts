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
    
    // ===== BETTING FILTERS (from current lines) =====
    
    const isHome = filters.location !== 'away'
    const teamPrefix = isHome ? 'home' : 'away'
    const oppPrefix = isHome ? 'away' : 'home'
    
    // Favorite/Dog filter
    if (filters.is_favorite === true) {
      conditions.push(`curr.${teamPrefix}_spread < 0`)
      appliedFilters.push('Favorite')
    } else if (filters.is_favorite === false) {
      conditions.push(`curr.${teamPrefix}_spread > 0`)
      appliedFilters.push('Underdog')
    }
    
    // Spread range
    if (filters.spread_range) {
      const { min, max } = filters.spread_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`curr.${teamPrefix}_spread BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Spread ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`curr.${teamPrefix}_spread >= ${min}`)
        appliedFilters.push(`Spread ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`curr.${teamPrefix}_spread <= ${max}`)
        appliedFilters.push(`Spread ≤${max}`)
      }
    }
    
    // Total range
    if (filters.total_range) {
      const { min, max } = filters.total_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`curr.total_line BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Total ${min}-${max}`)
      } else if (min !== undefined) {
        conditions.push(`curr.total_line >= ${min}`)
        appliedFilters.push(`Total ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`curr.total_line <= ${max}`)
        appliedFilters.push(`Total ≤${max}`)
      }
    }
    
    // ML range
    if (filters.ml_range) {
      const { min, max } = filters.ml_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`curr.${teamPrefix}_ml BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`ML ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`curr.${teamPrefix}_ml >= ${min}`)
        appliedFilters.push(`ML ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`curr.${teamPrefix}_ml <= ${max}`)
        appliedFilters.push(`ML ≤${max}`)
      }
    }
    
    // ===== LINE MOVEMENT FILTERS =====
    
    // Spread movement
    if (filters.spread_movement_range) {
      const { min, max } = filters.spread_movement_range
      // Movement = current - opening (positive = line moved toward team)
      const moveExpr = isHome 
        ? '(open.opening_spread - curr.home_spread)'  // Negative opening becoming less negative = positive move
        : '(curr.away_spread - (-open.opening_spread))'
      
      if (min !== undefined && max !== undefined) {
        conditions.push(`(curr.home_spread - open.opening_spread) BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Spread Move ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`(curr.home_spread - open.opening_spread) >= ${min}`)
        appliedFilters.push(`Spread Move ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`(curr.home_spread - open.opening_spread) <= ${max}`)
        appliedFilters.push(`Spread Move ≤${max}`)
      }
    }
    
    // Total movement
    if (filters.total_movement_range) {
      const { min, max } = filters.total_movement_range
      if (min !== undefined && max !== undefined) {
        conditions.push(`(curr.total_line - open.opening_total) BETWEEN ${min} AND ${max}`)
        appliedFilters.push(`Total Move ${min} to ${max}`)
      } else if (min !== undefined) {
        conditions.push(`(curr.total_line - open.opening_total) >= ${min}`)
        appliedFilters.push(`Total Move ${min}+`)
      } else if (max !== undefined) {
        conditions.push(`(curr.total_line - open.opening_total) <= ${max}`)
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
    
    // Query for upcoming games with current and opening lines
    const sql = `
      WITH 
        current_lines AS (
          SELECT 
            game_id,
            bookmaker,
            bookmaker_title,
            home_spread,
            home_spread_odds,
            away_spread,
            away_spread_odds,
            total_line,
            over_odds,
            under_odds,
            home_ml,
            away_ml,
            snapshot_time
          FROM nfl_line_snapshots
          WHERE (game_id, bookmaker, snapshot_time) IN (
            SELECT game_id, bookmaker, max(snapshot_time)
            FROM nfl_line_snapshots
            GROUP BY game_id, bookmaker
          )
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
        g.game_id,
        g.game_time,
        g.home_team_id,
        g.away_team_id,
        g.home_team_name,
        g.away_team_name,
        g.home_team_abbr,
        g.away_team_abbr,
        g.is_division_game,
        g.is_conference_game,
        g.home_offense_rank,
        g.home_defense_rank,
        g.away_offense_rank,
        g.away_defense_rank,
        g.home_streak,
        g.away_streak,
        g.home_prev_margin,
        g.away_prev_margin,
        curr.bookmaker,
        curr.bookmaker_title,
        curr.home_spread,
        curr.home_spread_odds,
        curr.away_spread,
        curr.away_spread_odds,
        curr.total_line,
        curr.over_odds,
        curr.under_odds,
        curr.home_ml,
        curr.away_ml,
        open.opening_spread,
        open.opening_total,
        open.opening_home_ml,
        open.opening_away_ml,
        curr.home_spread - open.opening_spread as spread_movement,
        curr.total_line - open.opening_total as total_movement,
        curr.home_ml - open.opening_home_ml as home_ml_movement
      FROM nfl_upcoming_games g
      JOIN current_lines curr ON g.game_id = curr.game_id
      LEFT JOIN opening_lines open ON g.game_id = open.game_id AND curr.bookmaker = open.bookmaker
      WHERE 1=1
      ${whereClause}
      ORDER BY g.game_time ASC, curr.bookmaker
    `
    
    console.log('Upcoming query SQL:', sql)
    
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
            prev_margin: row.home_prev_margin
          },
          away_team: {
            id: row.away_team_id,
            name: row.away_team_name,
            abbr: row.away_team_abbr,
            offense_rank: row.away_offense_rank,
            defense_rank: row.away_defense_rank,
            streak: row.away_streak,
            prev_margin: row.away_prev_margin
          },
          is_division_game: row.is_division_game === 1,
          is_conference_game: row.is_conference_game === 1,
          books: []
        })
      }
      
      gameMap.get(row.game_id).books.push({
        bookmaker: row.bookmaker,
        bookmaker_title: row.bookmaker_title,
        spread: {
          home: row.home_spread,
          home_odds: row.home_spread_odds,
          away: row.away_spread,
          away_odds: row.away_spread_odds,
          opening: row.opening_spread,
          movement: row.spread_movement
        },
        total: {
          line: row.total_line,
          over_odds: row.over_odds,
          under_odds: row.under_odds,
          opening: row.opening_total,
          movement: row.total_movement
        },
        moneyline: {
          home: row.home_ml,
          away: row.away_ml,
          opening_home: row.opening_home_ml,
          opening_away: row.opening_away_ml,
          home_movement: row.home_ml_movement
        }
      })
    }
    
    const games = Array.from(gameMap.values())
    
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

