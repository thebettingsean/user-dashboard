import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'

const ESPN_CORE_URL = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'
const ESPN_SITE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

/**
 * Ingest NFL Historical Box Scores
 * Fetches all games from 2024 and 2025 seasons
 * Extracts player stats and inserts into ClickHouse
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2025'
  const week = searchParams.get('week') // Optional: specific week
  
  try {
    console.log(`[NFL Ingest] Starting for ${season} season${week ? `, week ${week}` : ''}...`)
    
    const summary = {
      season: parseInt(season),
      games_processed: 0,
      games_completed: 0,
      players_with_stats: 0,
      box_scores_inserted: 0,
      errors: [] as string[]
    }

    // Determine weeks to process
    let weeksToProcess: number[]
    if (week) {
      weeksToProcess = [parseInt(week)]
    } else {
      // NFL regular season is 18 weeks
      // For 2025 (current season), only go up to Week 13 (current week as of Dec 1, 2025)
      const maxWeek = season === '2025' ? 13 : 18
      weeksToProcess = Array.from({ length: maxWeek }, (_, i) => i + 1)
    }

    const allBoxScores: any[] = []

    for (const weekNum of weeksToProcess) {
      console.log(`[NFL Ingest] Processing week ${weekNum}...`)
      
      try {
        // Fetch scoreboard for the week
        const scoreboardUrl = `${ESPN_SITE_URL}/scoreboard?seasontype=2&week=${weekNum}&dates=${season}`
        const scoreboardResponse = await fetch(scoreboardUrl)
        
        if (!scoreboardResponse.ok) {
          console.warn(`[NFL Ingest] Failed to fetch scoreboard for week ${weekNum}`)
          continue
        }

        const scoreboard = await scoreboardResponse.json()
        const games = scoreboard.events || []
        
        console.log(`[NFL Ingest] Found ${games.length} games in week ${weekNum}`)

        for (const game of games) {
          summary.games_processed++
          
          // Only process completed games
          if (!game.status?.type?.completed) {
            console.log(`[NFL Ingest] Skipping incomplete game: ${game.name}`)
            continue
          }

          summary.games_completed++
          const gameId = game.id

          // Get game date
          const gameDate = new Date(game.date)
          
          console.log(`[NFL Ingest] Processing game ${gameId}: ${game.name}`)

          // Process both teams
          for (const competitor of game.competitions[0].competitors) {
            const teamId = competitor.id
            
            try {
              // Fetch team statistics from Core API
              const statsUrl = `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/statistics`
              const statsResponse = await fetch(statsUrl)
              
              if (!statsResponse.ok) {
                console.warn(`[NFL Ingest] Failed to fetch stats for team ${teamId}`)
                continue
              }

              const teamStats = await statsResponse.json()
              
              // Extract offensive players (passing, rushing, receiving)
              const offensiveCategories = ['passing', 'rushing', 'receiving']
              const processedPlayers = new Set<string>()

              for (const category of teamStats.splits?.categories || []) {
                if (!offensiveCategories.includes(category.name)) continue

                for (const athlete of category.athletes || []) {
                  if (!athlete.athlete?.$ref) continue
                  
                  const athleteId = athlete.athlete.$ref.split('/athletes/')[1]?.split('?')[0]
                  if (!athleteId || processedPlayers.has(athleteId)) continue
                  
                  processedPlayers.add(athleteId)

                  // Fetch individual player stats
                  const playerBoxScore = await fetchPlayerBoxScore(
                    gameId,
                    teamId,
                    athleteId,
                    weekNum,
                    gameDate,
                    parseInt(season)
                  )

                  if (playerBoxScore) {
                    allBoxScores.push(playerBoxScore)
                    summary.players_with_stats++
                  }

                  // Rate limit
                  await new Promise(r => setTimeout(r, 50))
                }
              }

            } catch (err: any) {
              console.error(`[NFL Ingest] Error processing team ${teamId}:`, err.message)
              summary.errors.push(`Team ${teamId}: ${err.message}`)
            }

            // Rate limit between teams
            await new Promise(r => setTimeout(r, 100))
          }
        }

      } catch (err: any) {
        console.error(`[NFL Ingest] Error processing week ${weekNum}:`, err.message)
        summary.errors.push(`Week ${weekNum}: ${err.message}`)
      }
    }

    // Batch insert box scores into ClickHouse
    if (allBoxScores.length > 0) {
      console.log(`[NFL Ingest] Inserting ${allBoxScores.length} box scores into ClickHouse...`)
      
      for (let i = 0; i < allBoxScores.length; i += 100) {
        const batch = allBoxScores.slice(i, i + 100)
        try {
          await clickhouseInsert('nfl_box_scores', batch)
          summary.box_scores_inserted += batch.length
        } catch (err: any) {
          console.error(`[NFL Ingest] Error inserting batch ${i}:`, err.message)
          summary.errors.push(`Insert batch ${i}: ${err.message}`)
        }
      }
    }

    console.log('[NFL Ingest] Complete:', summary)

    return NextResponse.json({
      success: true,
      ...summary
    })

  } catch (error: any) {
    console.error('[NFL Ingest] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        season: parseInt(season)
      },
      { status: 500 }
    )
  }
}

async function fetchPlayerBoxScore(
  gameId: string,
  teamId: string,
  athleteId: string,
  week: number,
  gameDate: Date,
  season: number
): Promise<any | null> {
  try {
    // Get athlete info
    const athleteResponse = await fetch(`${ESPN_CORE_URL}/seasons/${season}/athletes/${athleteId}`)
    if (!athleteResponse.ok) return null
    const athleteInfo = await athleteResponse.json()

    // Get game stats
    const statsResponse = await fetch(
      `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/roster/${athleteId}/statistics/0`
    )
    if (!statsResponse.ok) return null
    const statsData = await statsResponse.json()

    // Initialize stats object matching ClickHouse schema
    const stats = {
      player_id: parseInt(athleteId),
      game_id: parseInt(gameId),
      game_date: gameDate.toISOString().split('T')[0], // YYYY-MM-DD
      season: season,
      week: week,
      
      // Game context
      team_id: parseInt(teamId),
      opponent_id: 0, // Will populate later
      is_home: 0,
      is_division: 0,
      is_conference: 0,
      
      // Betting context (defaults for now)
      team_was_favorite: 0,
      game_total: 0,
      team_spread: 0,
      
      // Opponent defensive ranks (defaults for now)
      opp_def_rank_pass_yards: 0,
      opp_def_rank_rush_yards: 0,
      opp_def_rank_receptions: 0,
      opp_def_rank_receiving_yards: 0,
      
      // QB Stats
      pass_attempts: 0,
      pass_completions: 0,
      pass_yards: 0,
      pass_tds: 0,
      interceptions: 0,
      sacks: 0,
      qb_rating: 0,
      
      // RB/Rushing Stats
      rush_attempts: 0,
      rush_yards: 0,
      rush_tds: 0,
      rush_long: 0,
      yards_per_carry: 0,
      
      // Receiving Stats
      targets: 0,
      receptions: 0,
      receiving_yards: 0,
      receiving_tds: 0,
      receiving_long: 0,
      yards_per_reception: 0,
      
      // Other
      fumbles: 0,
      fumbles_lost: 0,
      
      created_at: Math.floor(Date.now() / 1000)
    }

    let hasStats = false

    // Extract stats from each category
    for (const category of statsData.splits?.categories || []) {
      const categoryStats = category.stats || []

      if (category.name === 'passing') {
        stats.pass_attempts = categoryStats.find((s: any) => s.name === 'passingAttempts')?.value || 0
        stats.pass_completions = categoryStats.find((s: any) => s.name === 'completions')?.value || 0
        stats.pass_yards = categoryStats.find((s: any) => s.name === 'passingYards')?.value || 0
        stats.pass_tds = categoryStats.find((s: any) => s.name === 'passingTouchdowns')?.value || 0
        stats.interceptions = categoryStats.find((s: any) => s.name === 'interceptions')?.value || 0
        stats.sacks = categoryStats.find((s: any) => s.name === 'sacks')?.value || 0
        stats.qb_rating = categoryStats.find((s: any) => s.name === 'QBRating')?.value || 0
        if (stats.pass_yards > 0 || stats.pass_attempts > 0) hasStats = true
      } 
      else if (category.name === 'rushing') {
        stats.rush_attempts = categoryStats.find((s: any) => s.name === 'rushingAttempts')?.value || 0
        stats.rush_yards = categoryStats.find((s: any) => s.name === 'rushingYards')?.value || 0
        stats.rush_tds = categoryStats.find((s: any) => s.name === 'rushingTouchdowns')?.value || 0
        stats.rush_long = categoryStats.find((s: any) => s.name === 'longRushing')?.value || 0
        if (stats.rush_attempts > 0 && stats.rush_yards > 0) {
          stats.yards_per_carry = stats.rush_yards / stats.rush_attempts
        }
        if (stats.rush_yards > 0 || stats.rush_attempts > 0) hasStats = true
      } 
      else if (category.name === 'receiving') {
        stats.targets = categoryStats.find((s: any) => s.name === 'receivingTargets')?.value || 0
        stats.receptions = categoryStats.find((s: any) => s.name === 'receptions')?.value || 0
        stats.receiving_yards = categoryStats.find((s: any) => s.name === 'receivingYards')?.value || 0
        stats.receiving_tds = categoryStats.find((s: any) => s.name === 'receivingTouchdowns')?.value || 0
        stats.receiving_long = categoryStats.find((s: any) => s.name === 'longReception')?.value || 0
        if (stats.receptions > 0 && stats.receiving_yards > 0) {
          stats.yards_per_reception = stats.receiving_yards / stats.receptions
        }
        if (stats.receptions > 0 || stats.targets > 0) hasStats = true
      }
      else if (category.name === 'general' || category.name === 'fumbles') {
        const totalFumbles = categoryStats.find((s: any) => s.name === 'fumbles')?.value || 0
        const fumblesLost = categoryStats.find((s: any) => s.name === 'fumblesLost')?.value || 0
        if (totalFumbles > 0) stats.fumbles = totalFumbles
        if (fumblesLost > 0) stats.fumbles_lost = fumblesLost
      }
    }

    return hasStats ? stats : null

  } catch (error: any) {
    console.error(`[NFL Ingest] Error fetching player ${athleteId}:`, error.message)
    return null
  }
}

