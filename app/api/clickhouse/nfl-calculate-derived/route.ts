import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Calculate all derived fields for nfl_games:
 * - Movement (spread, ML, total)
 * - Outcomes (went_over/under, home_covered, pushes)
 * - Division/Conference games
 */
export async function POST() {
  try {
    const results: any = {
      movement: {},
      outcomes: {},
      division_conference: {}
    }
    
    // ========================================
    // 1. CALCULATE MOVEMENT COLUMNS
    // ========================================
    console.log('Calculating movement columns...')
    
    // Spread movement
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        spread_movement = spread_close - spread_open
      WHERE spread_open != 0 AND spread_close != 0
    `)
    results.movement.spread = 'Updated'
    
    // ML movement
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        home_ml_movement = home_ml_close - home_ml_open,
        away_ml_movement = away_ml_close - away_ml_open
      WHERE home_ml_open != 0 AND home_ml_close != 0
    `)
    results.movement.moneyline = 'Updated'
    
    // Total movement
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        total_movement = total_close - total_open
      WHERE total_open != 0 AND total_close != 0
    `)
    results.movement.total = 'Updated'
    
    // ========================================
    // 2. CALCULATE OUTCOME COLUMNS
    // ========================================
    console.log('Calculating outcome columns...')
    
    // Home won
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        home_won = CASE WHEN home_score > away_score THEN 1 ELSE 0 END,
        margin_of_victory = abs(home_score - away_score),
        total_points = home_score + away_score
      WHERE home_score > 0 OR away_score > 0
    `)
    results.outcomes.basic = 'Updated'
    
    // Total outcomes (over/under/push)
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        went_over = CASE WHEN (home_score + away_score) > total_close THEN 1 ELSE 0 END,
        went_under = CASE WHEN (home_score + away_score) < total_close THEN 1 ELSE 0 END,
        total_push = CASE WHEN (home_score + away_score) = total_close THEN 1 ELSE 0 END
      WHERE total_close != 0 AND (home_score > 0 OR away_score > 0)
    `)
    results.outcomes.total = 'Updated'
    
    // Spread outcomes (home covered = home margin > -spread)
    // If spread_close = -3 (home favored), home needs to win by 4+ to cover
    // If spread_close = 3 (home underdog), home can lose by 2 or less to cover
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE 
        home_covered = CASE 
          WHEN (home_score - away_score) > (-1 * spread_close) THEN 1 
          ELSE 0 
        END,
        spread_push = CASE 
          WHEN (home_score - away_score) = (-1 * spread_close) THEN 1 
          ELSE 0 
        END
      WHERE spread_close != 0 AND (home_score > 0 OR away_score > 0)
    `)
    results.outcomes.spread = 'Updated'
    
    // ========================================
    // 3. CALCULATE DIVISION/CONFERENCE GAMES
    // ========================================
    console.log('Calculating division/conference games...')
    
    // First, get all team divisions and conferences
    const teamsResult = await clickhouseQuery(`
      SELECT team_id, division, conference 
      FROM teams 
      WHERE sport = 'nfl'
    `)
    
    const teams = teamsResult.data as { team_id: number, division: string, conference: string }[]
    console.log(`Found ${teams.length} NFL teams`)
    
    // Create lookup maps
    const teamDivision: Record<number, string> = {}
    const teamConference: Record<number, string> = {}
    teams.forEach(t => {
      teamDivision[t.team_id] = t.division
      teamConference[t.team_id] = t.conference
    })
    
    // Get all games and update them individually (more reliable)
    const gamesResult = await clickhouseQuery(`
      SELECT game_id, home_team_id, away_team_id FROM nfl_games
    `)
    
    const games = gamesResult.data as { game_id: number, home_team_id: number, away_team_id: number }[]
    console.log(`Processing ${games.length} games for division/conference...`)
    
    let divisionCount = 0
    let conferenceCount = 0
    
    // Batch the updates
    const divisionGameIds: number[] = []
    const conferenceGameIds: number[] = []
    
    for (const game of games) {
      const homeDivision = teamDivision[game.home_team_id]
      const awayDivision = teamDivision[game.away_team_id]
      const homeConference = teamConference[game.home_team_id]
      const awayConference = teamConference[game.away_team_id]
      
      // Same division = division game
      if (homeDivision && awayDivision && homeDivision === awayDivision) {
        divisionGameIds.push(game.game_id)
        divisionCount++
      }
      
      // Same conference = conference game (includes division games)
      if (homeConference && awayConference && homeConference === awayConference) {
        conferenceGameIds.push(game.game_id)
        conferenceCount++
      }
    }
    
    console.log(`Found ${divisionCount} division games, ${conferenceCount} conference games`)
    
    // Update division games in one query
    if (divisionGameIds.length > 0) {
      await clickhouseCommand(`
        ALTER TABLE nfl_games UPDATE is_division_game = 1
        WHERE game_id IN (${divisionGameIds.join(',')})
      `)
    }
    
    // Update conference games in one query
    if (conferenceGameIds.length > 0) {
      await clickhouseCommand(`
        ALTER TABLE nfl_games UPDATE is_conference_game = 1
        WHERE game_id IN (${conferenceGameIds.join(',')})
      `)
    }
    
    results.division_conference = {
      division_games: divisionCount,
      conference_games: conferenceCount,
      total_games: games.length
    }
    
    // ========================================
    // 4. VERIFY RESULTS
    // ========================================
    const verifyResult = await clickhouseQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN spread_movement != 0 THEN 1 ELSE 0 END) as has_spread_movement,
        SUM(CASE WHEN went_over = 1 OR went_under = 1 OR total_push = 1 THEN 1 ELSE 0 END) as has_total_outcome,
        SUM(CASE WHEN home_covered = 1 OR spread_push = 1 OR (home_covered = 0 AND spread_push = 0 AND spread_close != 0) THEN 1 ELSE 0 END) as has_spread_outcome,
        SUM(CASE WHEN is_division_game = 1 THEN 1 ELSE 0 END) as division_games,
        SUM(CASE WHEN is_conference_game = 1 THEN 1 ELSE 0 END) as conference_games
      FROM nfl_games
    `)
    
    return NextResponse.json({
      success: true,
      updates: results,
      verification: verifyResult.data?.[0]
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

