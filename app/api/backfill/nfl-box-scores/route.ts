/**
 * Backfill NFL Box Scores
 * 
 * Fetches box scores from ESPN for completed games that are missing player stats
 */

import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// Helper: Parse athlete stats from ESPN format
function parseAthleteStats(statStrings: string[], categoryName: string): Record<string, number> {
  const stats: Record<string, number> = {}
  
  if (categoryName === 'passing') {
    // C/ATT, YDS, AVG, TD, INT, QBR, RTG, SACKS
    stats.pass_completions = parseInt(statStrings[0]?.split('/')[0] || '0')
    stats.pass_attempts = parseInt(statStrings[0]?.split('/')[1] || '0')
    stats.pass_yards = parseInt(statStrings[1] || '0')
    stats.pass_tds = parseInt(statStrings[3] || '0')
    stats.interceptions = parseInt(statStrings[4] || '0')
    stats.qb_rating = parseFloat(statStrings[6] || '0')
    stats.sacks = parseInt(statStrings[7] || '0')
  } else if (categoryName === 'rushing') {
    // CAR, YDS, AVG, TD, LONG
    stats.rush_attempts = parseInt(statStrings[0] || '0')
    stats.rush_yards = parseInt(statStrings[1] || '0')
    stats.yards_per_carry = parseFloat(statStrings[2] || '0')
    stats.rush_tds = parseInt(statStrings[3] || '0')
    stats.rush_long = parseInt(statStrings[4] || '0')
  } else if (categoryName === 'receiving') {
    // REC, YDS, AVG, TD, LONG, TGTS
    stats.receptions = parseInt(statStrings[0] || '0')
    stats.receiving_yards = parseInt(statStrings[1] || '0')
    stats.yards_per_reception = parseFloat(statStrings[2] || '0')
    stats.receiving_tds = parseInt(statStrings[3] || '0')
    stats.receiving_long = parseInt(statStrings[4] || '0')
    stats.targets = parseInt(statStrings[5] || '0')
  }
  
  return stats
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || '2025-12-16'
  const endDate = searchParams.get('endDate') || '2025-12-23'
  
  const startTime = Date.now()
  let gamesProcessed = 0
  let boxScoresAdded = 0
  const errors: any[] = []
  
  try {
    console.log(`[BOX SCORE BACKFILL] Starting backfill for ${startDate} to ${endDate}`)
    
    // Find completed games missing box scores in the date range
    const missingGamesQuery = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        g.espn_game_id,
        toString(g.game_date) as game_date,
        g.home_team_id,
        g.away_team_id,
        g.home_score,
        g.away_score,
        g.season,
        g.week
      FROM nfl_games g
      LEFT JOIN nfl_box_scores_v2 b ON g.game_id = b.game_id
      WHERE g.game_date >= '${startDate}'
        AND g.game_date <= '${endDate}'
        AND (g.home_score > 0 OR g.away_score > 0)
        AND b.game_id IS NULL
        AND g.espn_game_id > 0
      ORDER BY g.game_date ASC
    `)
    
    const missingGames = missingGamesQuery.data || []
    console.log(`[BOX SCORE BACKFILL] Found ${missingGames.length} games missing box scores`)
    
    if (missingGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No games missing box scores in this date range',
        startDate,
        endDate,
        elapsed_ms: Date.now() - startTime
      })
    }
    
    // Process each game
    for (const game of missingGames) {
      try {
        console.log(`[BOX SCORE BACKFILL] Processing game ${game.espn_game_id}...`)
        
        const summaryResponse = await fetch(`${ESPN_BASE}/summary?event=${game.espn_game_id}`)
        
        if (!summaryResponse.ok) {
          errors.push({
            game_id: game.espn_game_id,
            error: `ESPN API returned ${summaryResponse.status}`
          })
          continue
        }
        
        const summaryData = await summaryResponse.json()
        const boxscore = summaryData.boxscore
        
        if (!boxscore || !boxscore.players) {
          console.log(`[BOX SCORE BACKFILL] No box score data for game ${game.espn_game_id}`)
          continue
        }
        
        // Extract and update referee data
        try {
          const officials = summaryData.gameInfo?.officials
          if (officials && officials.length > 0) {
            const referee = officials.find((official: any) => 
              official.position?.displayName === 'Referee' || 
              official.position?.abbreviation === 'REF'
            )
            
            if (referee) {
              const refereeName = (referee.displayName || referee.fullName || '').replace(/'/g, "''")
              const refereeId = parseInt(referee.id) || 0
              
              if (refereeName) {
                await clickhouseCommand(`
                  ALTER TABLE nfl_games
                  UPDATE 
                    referee_name = '${refereeName}',
                    referee_id = ${refereeId}
                  WHERE espn_game_id = '${game.espn_game_id}'
                `)
                console.log(`[BOX SCORE BACKFILL] Updated referee: ${refereeName}`)
              }
            }
          }
        } catch (refError: any) {
          console.log(`[BOX SCORE BACKFILL] Error updating referee for game ${game.espn_game_id}:`, refError.message)
        }
        
        // Collect all player stats, deduped by player ID
        const playerStatsMap = new Map<number, { 
          teamId: number, 
          opponentId: number, 
          isHome: number, 
          stats: Record<string, number> 
        }>()
        
        for (const teamPlayers of boxscore.players) {
          const teamId = parseInt(teamPlayers.team?.id) || 0
          const isHome = teamId === game.home_team_id ? 1 : 0
          const opponentId = isHome === 1 ? game.away_team_id : game.home_team_id
          
          for (const category of teamPlayers.statistics || []) {
            for (const athlete of category.athletes || []) {
              const playerId = parseInt(athlete.athlete?.id) || 0
              if (playerId === 0) continue
              
              const newStats = parseAthleteStats(athlete.stats, category.name)
              
              // Merge stats if player already exists
              if (playerStatsMap.has(playerId)) {
                const existing = playerStatsMap.get(playerId)!
                Object.assign(existing.stats, newStats)
              } else {
                playerStatsMap.set(playerId, {
                  teamId, 
                  opponentId, 
                  isHome, 
                  stats: newStats
                })
              }
            }
          }
        }
        
        // Insert deduplicated player stats
        let playersInserted = 0
        for (const [playerId, data] of playerStatsMap) {
          const stats = data.stats
          
          // Only insert if player has meaningful stats
          if (stats.pass_yards || stats.rush_yards || stats.receiving_yards || 
              stats.pass_tds || stats.rush_tds || stats.receiving_tds) {
            
            await clickhouseCommand(`
              INSERT INTO nfl_box_scores_v2 (
                player_id, game_id, game_date, season, week, 
                team_id, opponent_id, is_home,
                pass_attempts, pass_completions, pass_yards, pass_tds, interceptions,
                sacks, qb_rating,
                rush_attempts, rush_yards, rush_tds, rush_long, yards_per_carry,
                targets, receptions, receiving_yards, receiving_tds, receiving_long, yards_per_reception,
                created_at
              ) VALUES (
                ${playerId}, ${game.espn_game_id}, '${game.game_date}', ${game.season}, ${game.week},
                ${data.teamId}, ${data.opponentId}, ${data.isHome},
                ${stats.pass_attempts || 0}, ${stats.pass_completions || 0}, 
                ${stats.pass_yards || 0}, ${stats.pass_tds || 0}, ${stats.interceptions || 0},
                ${stats.sacks || 0}, ${stats.qb_rating || 0},
                ${stats.rush_attempts || 0}, ${stats.rush_yards || 0}, 
                ${stats.rush_tds || 0}, ${stats.rush_long || 0}, ${stats.yards_per_carry || 0},
                ${stats.targets || 0}, ${stats.receptions || 0}, 
                ${stats.receiving_yards || 0}, ${stats.receiving_tds || 0}, 
                ${stats.receiving_long || 0}, ${stats.yards_per_reception || 0},
                now()
              )
            `)
            playersInserted++
            boxScoresAdded++
          }
        }
        
        console.log(`[BOX SCORE BACKFILL] ✅ Game ${game.espn_game_id}: Added ${playersInserted} players`)
        gamesProcessed++
        
      } catch (error: any) {
        console.error(`[BOX SCORE BACKFILL] Error processing game ${game.espn_game_id}:`, error.message)
        errors.push({
          game_id: game.espn_game_id,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      gamesProcessed,
      boxScoresAdded,
      totalGamesMissing: missingGames.length,
      errors: errors.length > 0 ? errors : undefined,
      startDate,
      endDate,
      elapsed_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('[BOX SCORE BACKFILL] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      gamesProcessed,
      boxScoresAdded,
      elapsed_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

