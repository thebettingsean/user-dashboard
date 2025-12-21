/**
 * Backfill NFL Referee Data
 * 
 * Fetches referee/official data from ESPN for completed games
 * and updates the nfl_games table
 */

import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || '2025-11-23'
  const endDate = searchParams.get('endDate') || '2025-12-21'
  
  const startTime = Date.now()
  let gamesProcessed = 0
  let refereesAdded = 0
  const errors: any[] = []
  
  try {
    console.log(`[REFEREE BACKFILL] Starting backfill for ${startDate} to ${endDate}`)
    
    // Find completed games in the date range
    const gamesQuery = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        espn_game_id,
        toString(game_date) as game_date,
        home_score,
        away_score,
        referee_name,
        referee_id
      FROM nfl_games
      WHERE game_date >= '${startDate}'
        AND game_date <= '${endDate}'
        AND (home_score > 0 OR away_score > 0)
        AND espn_game_id != ''
        AND espn_game_id != '0'
      ORDER BY game_date ASC
    `)
    
    const games = gamesQuery.data || []
    console.log(`[REFEREE BACKFILL] Found ${games.length} completed games`)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed games found in this date range',
        startDate,
        endDate,
        elapsed_ms: Date.now() - startTime
      })
    }
    
    // Process each game
    for (const game of games) {
      try {
        console.log(`[REFEREE BACKFILL] Processing game ${game.espn_game_id}...`)
        
        const summaryResponse = await fetch(`${ESPN_BASE}/summary?event=${game.espn_game_id}`)
        
        if (!summaryResponse.ok) {
          errors.push({
            game_id: game.espn_game_id,
            error: `ESPN API returned ${summaryResponse.status}`
          })
          continue
        }
        
        const summaryData = await summaryResponse.json()
        
        // Extract referee data from gameInfo.officials
        const officials = summaryData.gameInfo?.officials
        
        if (!officials || officials.length === 0) {
          console.log(`[REFEREE BACKFILL] No officials data for game ${game.espn_game_id}`)
          continue
        }
        
        // Find the referee (position: "Referee" or "REF")
        const referee = officials.find((official: any) => 
          official.position?.displayName === 'Referee' || 
          official.position?.abbreviation === 'REF'
        )
        
        if (!referee) {
          console.log(`[REFEREE BACKFILL] No referee found for game ${game.espn_game_id}`)
          continue
        }
        
        const refereeName = referee.displayName || referee.fullName || ''
        const refereeId = parseInt(referee.id) || 0
        
        if (!refereeName) {
          console.log(`[REFEREE BACKFILL] Empty referee name for game ${game.espn_game_id}`)
          continue
        }
        
        // Update nfl_games with referee data
        await clickhouseCommand(`
          ALTER TABLE nfl_games
          UPDATE 
            referee_name = '${refereeName.replace(/'/g, "''")}',
            referee_id = ${refereeId}
          WHERE espn_game_id = '${game.espn_game_id}'
        `)
        
        console.log(`[REFEREE BACKFILL] ✅ Game ${game.espn_game_id}: ${refereeName}`)
        refereesAdded++
        gamesProcessed++
        
      } catch (error: any) {
        console.error(`[REFEREE BACKFILL] Error processing game ${game.espn_game_id}:`, error.message)
        errors.push({
          game_id: game.espn_game_id,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      gamesProcessed,
      refereesAdded,
      totalGames: games.length,
      errors: errors.length > 0 ? errors : undefined,
      startDate,
      endDate,
      elapsed_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('[REFEREE BACKFILL] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      gamesProcessed,
      refereesAdded,
      elapsed_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

