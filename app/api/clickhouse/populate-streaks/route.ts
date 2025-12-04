import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

/**
 * Populates streak and previous game margin columns for nfl_games
 * 
 * Columns added:
 * - home_streak: Consecutive wins (positive) or losses (negative) coming into game
 * - away_streak: Same for away team
 * - home_prev_margin: Margin of victory/loss in previous game for home team
 * - away_prev_margin: Same for away team
 */

interface GameResult {
  game_id: number
  season: number
  week: number
  game_date: string
  home_team_id: number
  away_team_id: number
  home_score: number
  away_score: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'
  
  try {
    if (action === 'status') {
      // Check current column status
      const columns = await clickhouseQuery<{ name: string }>(`
        SELECT name FROM system.columns 
        WHERE database = 'default' AND table = 'nfl_games'
        AND name IN ('home_streak', 'away_streak', 'home_prev_margin', 'away_prev_margin')
      `)
      
      const existingCols = columns.data.map(c => c.name)
      
      // Check if columns have data
      let dataStatus = { total: 0, withData: 0 }
      if (existingCols.includes('home_streak')) {
        const countResult = await clickhouseQuery<{ total: number, with_data: number }>(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN home_streak != 0 OR away_streak != 0 THEN 1 ELSE 0 END) as with_data
          FROM nfl_games
        `)
        if (countResult.data.length > 0) {
          dataStatus = { total: countResult.data[0].total, withData: countResult.data[0].with_data }
        }
      }
      
      return NextResponse.json({
        success: true,
        columns_exist: existingCols,
        missing_columns: ['home_streak', 'away_streak', 'home_prev_margin', 'away_prev_margin']
          .filter(c => !existingCols.includes(c)),
        data_status: dataStatus
      })
    }
    
    if (action === 'add_columns') {
      // Add columns if they don't exist
      const columnsToAdd = [
        { name: 'home_streak', type: 'Int8', default: '0' },
        { name: 'away_streak', type: 'Int8', default: '0' },
        { name: 'home_prev_margin', type: 'Int16', default: '0' },
        { name: 'away_prev_margin', type: 'Int16', default: '0' }
      ]
      
      const results = []
      for (const col of columnsToAdd) {
        try {
          await clickhouseCommand(`
            ALTER TABLE nfl_games 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}
          `)
          results.push({ column: col.name, status: 'added' })
        } catch (err: any) {
          results.push({ column: col.name, status: 'error', error: err.message })
        }
      }
      
      return NextResponse.json({ success: true, results })
    }
    
    if (action === 'populate') {
      // Get all games ordered by date
      const gamesResult = await clickhouseQuery<GameResult>(`
        SELECT 
          game_id, season, week, game_date, 
          home_team_id, away_team_id,
          home_score, away_score
        FROM nfl_games
        WHERE home_score > 0 OR away_score > 0
        ORDER BY game_date ASC, game_id ASC
      `)
      
      const games = gamesResult.data
      console.log(`[PopulateStreaks] Processing ${games.length} games`)
      
      // Track each team's history
      const teamHistory: Record<number, { wins: number[], margins: number[] }> = {}
      
      // Helper to calculate streak from history
      const calculateStreak = (wins: number[]): number => {
        if (wins.length === 0) return 0
        const lastResult = wins[wins.length - 1]
        let streak = lastResult === 1 ? 1 : -1
        
        for (let i = wins.length - 2; i >= 0; i--) {
          if (wins[i] === lastResult) {
            streak = lastResult === 1 ? streak + 1 : streak - 1
          } else {
            break
          }
        }
        return streak
      }
      
      // Process games and build update statements
      const updates: { game_id: number, home_streak: number, away_streak: number, home_prev_margin: number, away_prev_margin: number }[] = []
      
      for (const game of games) {
        const homeTeamId = game.home_team_id
        const awayTeamId = game.away_team_id
        const homeWon = game.home_score > game.away_score ? 1 : 0
        const margin = game.home_score - game.away_score
        
        // Initialize team history if needed
        if (!teamHistory[homeTeamId]) {
          teamHistory[homeTeamId] = { wins: [], margins: [] }
        }
        if (!teamHistory[awayTeamId]) {
          teamHistory[awayTeamId] = { wins: [], margins: [] }
        }
        
        // Calculate streaks BEFORE this game (looking at previous games)
        const homeStreak = calculateStreak(teamHistory[homeTeamId].wins)
        const awayStreak = calculateStreak(teamHistory[awayTeamId].wins)
        
        // Get previous margin (last game's result)
        const homePrevMargin = teamHistory[homeTeamId].margins.length > 0 
          ? teamHistory[homeTeamId].margins[teamHistory[homeTeamId].margins.length - 1] 
          : 0
        const awayPrevMargin = teamHistory[awayTeamId].margins.length > 0 
          ? teamHistory[awayTeamId].margins[teamHistory[awayTeamId].margins.length - 1] 
          : 0
        
        updates.push({
          game_id: game.game_id,
          home_streak: homeStreak,
          away_streak: awayStreak,
          home_prev_margin: homePrevMargin,
          away_prev_margin: awayPrevMargin
        })
        
        // Update team history AFTER recording the pre-game state
        // Home team: won = 1, lost = 0; margin from home perspective
        teamHistory[homeTeamId].wins.push(homeWon)
        teamHistory[homeTeamId].margins.push(margin)
        
        // Away team: won = 1 - homeWon (opposite); margin from away perspective (negative of home margin)
        teamHistory[awayTeamId].wins.push(1 - homeWon)
        teamHistory[awayTeamId].margins.push(-margin)
      }
      
      console.log(`[PopulateStreaks] Built ${updates.length} updates, executing in batches...`)
      
      // Execute updates in batches
      const BATCH_SIZE = 100
      let updated = 0
      
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE)
        
        // Build batch update using CASE statements
        const gameIds = batch.map(u => u.game_id).join(',')
        
        // Create CASE statements for each column
        const homeStreakCases = batch.map(u => `WHEN ${u.game_id} THEN ${u.home_streak}`).join(' ')
        const awayStreakCases = batch.map(u => `WHEN ${u.game_id} THEN ${u.away_streak}`).join(' ')
        const homePrevMarginCases = batch.map(u => `WHEN ${u.game_id} THEN ${u.home_prev_margin}`).join(' ')
        const awayPrevMarginCases = batch.map(u => `WHEN ${u.game_id} THEN ${u.away_prev_margin}`).join(' ')
        
        await clickhouseCommand(`
          ALTER TABLE nfl_games UPDATE
            home_streak = CASE game_id ${homeStreakCases} ELSE home_streak END,
            away_streak = CASE game_id ${awayStreakCases} ELSE away_streak END,
            home_prev_margin = CASE game_id ${homePrevMarginCases} ELSE home_prev_margin END,
            away_prev_margin = CASE game_id ${awayPrevMarginCases} ELSE away_prev_margin END
          WHERE game_id IN (${gameIds})
        `)
        
        updated += batch.length
        
        if (updated % 500 === 0) {
          console.log(`[PopulateStreaks] Updated ${updated}/${updates.length} games`)
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Populated streak and margin data for ${updated} games`,
        sample_updates: updates.slice(0, 5)
      })
    }
    
    return NextResponse.json({ error: 'Invalid action. Use: status, add_columns, or populate' }, { status: 400 })
    
  } catch (error: any) {
    console.error('[PopulateStreaks] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

