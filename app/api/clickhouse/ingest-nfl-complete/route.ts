import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'
import { extractGameData, extractTeamStats, extractPlayerBoxScores } from '@/lib/nfl-extraction-helpers'

const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

/**
 * COMPLETE NFL DATA INGESTION
 * 
 * For a given season/week, ingests:
 * 1. Game data (scores, odds, outcomes) → nfl_games
 * 2. Team stats (both teams per game) → nfl_team_stats  
 * 3. Player box scores → nfl_box_scores_v2
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2022'
  const week = searchParams.get('week') || '1'
  
  const startTime = Date.now()
  
  try {
    console.log(`[NFL Complete Ingest] Starting ${season} Week ${week}...`)
    
    const summary = {
      season: parseInt(season),
      week: parseInt(week),
      games_processed: 0,
      games_inserted: 0,
      team_stats_inserted: 0,
      box_scores_inserted: 0,
      errors: [] as string[]
    }

    // Step 1: Fetch all games for this week
    const scoreboardUrl = `${ESPN_SITE}/scoreboard?seasontype=2&week=${week}&dates=${season}`
    const scoreboardRes = await fetch(scoreboardUrl)
    
    if (!scoreboardRes.ok) {
      throw new Error(`Failed to fetch scoreboard: ${scoreboardRes.status}`)
    }

    const scoreboard = await scoreboardRes.json()
    const games = scoreboard.events || []
    
    console.log(`[NFL Complete Ingest] Found ${games.length} games in ${season} Week ${week}`)

    const gamesData = []
    const teamStatsData = []
    const boxScoresData = []

    // Step 2: Process each game
    for (const event of games) {
      summary.games_processed++
      
      // Only process completed games
      if (!event.status?.type?.completed) {
        console.log(`[NFL Complete Ingest] Skipping incomplete game: ${event.name}`)
        continue
      }

      const gameId = parseInt(event.id)
      const gameDate = new Date(event.date)
      
      console.log(`[NFL Complete Ingest] Processing game ${gameId}: ${event.name}`)

      try {
        // Extract game data
        const gameData = await extractGameData(event, season, week, gameDate)
        if (gameData) {
          gamesData.push(gameData)
        }

        // Extract team stats for BOTH teams
        const teamStats = await extractTeamStats(event, gameId, season, week, gameDate)
        teamStatsData.push(...teamStats)

        // Extract player box scores for BOTH teams
        const boxScores = await extractPlayerBoxScores(event, gameId, season, week, gameDate)
        boxScoresData.push(...boxScores)

        await new Promise(r => setTimeout(r, 100)) // Rate limit

      } catch (err: any) {
        console.error(`[NFL Complete Ingest] Error processing game ${gameId}:`, err.message)
        summary.errors.push(`Game ${gameId}: ${err.message}`)
      }
    }

    // Step 3: Insert all data in batches
    console.log(`[NFL Complete Ingest] Inserting data...`)
    
    // Insert games
    if (gamesData.length > 0) {
      try {
        await clickhouseInsert('nfl_games', gamesData)
        summary.games_inserted = gamesData.length
        console.log(`✅ Inserted ${gamesData.length} games`)
      } catch (err: any) {
        console.error('❌ Failed to insert games:', err.message)
        summary.errors.push(`Games insert: ${err.message}`)
      }
    }

    // Insert team stats
    if (teamStatsData.length > 0) {
      try {
        for (let i = 0; i < teamStatsData.length; i += 50) {
          await clickhouseInsert('nfl_team_stats', teamStatsData.slice(i, i + 50))
        }
        summary.team_stats_inserted = teamStatsData.length
        console.log(`✅ Inserted ${teamStatsData.length} team stats`)
      } catch (err: any) {
        console.error('❌ Failed to insert team stats:', err.message)
        summary.errors.push(`Team stats insert: ${err.message}`)
      }
    }

    // Insert box scores
    if (boxScoresData.length > 0) {
      try {
        for (let i = 0; i < boxScoresData.length; i += 100) {
          await clickhouseInsert('nfl_box_scores_v2', boxScoresData.slice(i, i + 100))
        }
        summary.box_scores_inserted = boxScoresData.length
        console.log(`✅ Inserted ${boxScoresData.length} box scores`)
      } catch (err: any) {
        console.error('❌ Failed to insert box scores:', err.message)
        summary.errors.push(`Box scores insert: ${err.message}`)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[NFL Complete Ingest] Complete in ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      ...summary
    })

  } catch (error: any) {
    console.error('[NFL Complete Ingest] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        season: parseInt(season),
        week: parseInt(week),
        duration_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

