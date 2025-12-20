/**
 * Backfill ESPN Game IDs
 * 
 * Fetches games from ESPN and matches them to our database to populate missing ESPN game IDs
 */

import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || '2025-12-16'
  const endDate = searchParams.get('endDate') || '2025-12-23'
  
  const startTime = Date.now()
  let gamesMatched = 0
  let gamesUpdated = 0
  const errors: any[] = []
  
  try {
    console.log(`[ESPN ID BACKFILL] Starting backfill for ${startDate} to ${endDate}`)
    
    // Step 1: Get games from our database missing ESPN game IDs
    const ourGamesQuery = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        toString(g.game_date) as game_date,
        toString(g.game_time) as game_time,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team_name,
        at.name as away_team_name,
        g.espn_game_id
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.game_date >= '${startDate}'
        AND g.game_date <= '${endDate}'
        AND (g.espn_game_id = '' OR g.espn_game_id IS NULL OR g.espn_game_id = '0')
      ORDER BY g.game_date ASC
    `)
    
    const ourGames = ourGamesQuery.data || []
    console.log(`[ESPN ID BACKFILL] Found ${ourGames.length} games missing ESPN IDs`)
    
    if (ourGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No games missing ESPN IDs in this date range',
        startDate,
        endDate,
        elapsed_ms: Date.now() - startTime
      })
    }
    
    // Step 2: Fetch ESPN scoreboard data for the date range
    // We'll fetch multiple weeks to ensure coverage
    const espnGames: any[] = []
    
    // Fetch weeks 15-18 to cover December games
    for (let week = 15; week <= 18; week++) {
      try {
        const url = `${ESPN_BASE}/scoreboard?seasontype=2&week=${week}&dates=2025`
        console.log(`[ESPN ID BACKFILL] Fetching ESPN week ${week}...`)
        
        const response = await fetch(url)
        if (!response.ok) {
          console.error(`[ESPN ID BACKFILL] ESPN API error for week ${week}: ${response.status}`)
          continue
        }
        
        const data = await response.json()
        const events = data.events || []
        
        for (const event of events) {
          const competition = event.competitions?.[0]
          if (!competition) continue
          
          const espnGameId = parseInt(event.id)
          const gameDate = new Date(competition.date).toISOString().split('T')[0]
          
          // Check if game is in our date range
          if (gameDate >= startDate && gameDate <= endDate) {
            const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home')
            const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away')
            
            if (homeTeam && awayTeam) {
              espnGames.push({
                espn_game_id: espnGameId,
                game_date: gameDate,
                home_team_id: parseInt(homeTeam.team?.id || '0'),
                away_team_id: parseInt(awayTeam.team?.id || '0'),
                home_team_name: homeTeam.team?.displayName || '',
                away_team_name: awayTeam.team?.displayName || ''
              })
            }
          }
        }
      } catch (error: any) {
        console.error(`[ESPN ID BACKFILL] Error fetching week ${week}:`, error.message)
      }
    }
    
    console.log(`[ESPN ID BACKFILL] Found ${espnGames.length} ESPN games in date range`)
    
    // Step 3: Match our games to ESPN games and update
    for (const ourGame of ourGames) {
      try {
        // Find matching ESPN game by team IDs and date
        const matchingEspnGame = espnGames.find(eg => 
          eg.home_team_id === ourGame.home_team_id &&
          eg.away_team_id === ourGame.away_team_id &&
          eg.game_date === ourGame.game_date
        )
        
        if (matchingEspnGame) {
          // Update our game with ESPN game ID
          await clickhouseCommand(`
            ALTER TABLE nfl_games 
            UPDATE espn_game_id = '${matchingEspnGame.espn_game_id}'
            WHERE game_id = '${ourGame.game_id}'
          `)
          
          console.log(`[ESPN ID BACKFILL] ✅ Matched: ${ourGame.away_team_name} @ ${ourGame.home_team_name} → ESPN ID ${matchingEspnGame.espn_game_id}`)
          gamesMatched++
          gamesUpdated++
        } else {
          console.log(`[ESPN ID BACKFILL] ⚠️  No match for: ${ourGame.away_team_name} @ ${ourGame.home_team_name} on ${ourGame.game_date}`)
          errors.push({
            game_id: ourGame.game_id,
            game_date: ourGame.game_date,
            matchup: `${ourGame.away_team_name} @ ${ourGame.home_team_name}`,
            error: 'No matching ESPN game found'
          })
        }
      } catch (error: any) {
        console.error(`[ESPN ID BACKFILL] Error updating game ${ourGame.game_id}:`, error.message)
        errors.push({
          game_id: ourGame.game_id,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      gamesMatched,
      gamesUpdated,
      totalGamesMissing: ourGames.length,
      espnGamesFound: espnGames.length,
      errors: errors.length > 0 ? errors : undefined,
      startDate,
      endDate,
      elapsed_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('[ESPN ID BACKFILL] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      gamesMatched,
      gamesUpdated,
      elapsed_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

