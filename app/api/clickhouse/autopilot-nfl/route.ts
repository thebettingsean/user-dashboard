import { NextResponse } from 'next/server'

/**
 * AUTOPILOT: Complete NFL Historical Data Load
 * 
 * Loads ALL NFL data (2022-2025) in batches:
 * - Games (with odds for 2023+)
 * - Team stats (offense + defense)
 * - Player box scores
 * - Team rankings (calculated after each week)
 * 
 * Can run unattended - will process everything sequentially
 */

export const maxDuration = 300 // 5 minutes (Pro plan max is 800s)

export async function POST() {
  const startTime = Date.now()
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3003'
  
  try {
    console.log('[AUTOPILOT] Starting complete NFL historical load...')
    
    const seasons = [
      { year: 2022, weeks: 22 }, // Regular season (18) + Playoffs (4)
      { year: 2023, weeks: 22 }, // Regular season (18) + Playoffs (4)
      { year: 2024, weeks: 22 }, // Regular season (18) + Playoffs (4)
      { year: 2025, weeks: 13 }  // Current season (ongoing)
    ]
    
    const summary = {
      total_seasons: seasons.length,
      total_weeks: 0,
      total_games: 0,
      total_box_scores: 0,
      total_team_stats: 0,
      seasons_completed: [] as any[],
      errors: [] as string[]
    }

    for (const season of seasons) {
      console.log(`\n[AUTOPILOT] ======= SEASON ${season.year} =======`)
      const seasonStart = Date.now()
      
      const seasonSummary = {
        year: season.year,
        weeks_processed: 0,
        games: 0,
        box_scores: 0,
        team_stats: 0,
        duration_minutes: 0
      }

      // Process each week
      for (let week = 1; week <= season.weeks; week++) {
        console.log(`[AUTOPILOT] Processing ${season.year} Week ${week}...`)
        
        try {
          // Ingest week data
          const ingestRes = await fetch(
            `${baseUrl}/api/clickhouse/ingest-nfl-complete?season=${season.year}&week=${week}`
          )
          
          if (!ingestRes.ok) {
            throw new Error(`HTTP ${ingestRes.status}`)
          }
          
          const ingestData = await ingestRes.json()
          
          if (!ingestData.success) {
            throw new Error(ingestData.error || 'Ingestion failed')
          }
          
          seasonSummary.weeks_processed++
          seasonSummary.games += ingestData.games_inserted || 0
          seasonSummary.box_scores += ingestData.box_scores_inserted || 0
          seasonSummary.team_stats += ingestData.team_stats_inserted || 0
          
          console.log(`[AUTOPILOT] ✅ Week ${week}: ${ingestData.games_inserted} games, ${ingestData.box_scores_inserted} box scores`)
          
          // Calculate rankings for this week
          await fetch(
            `${baseUrl}/api/clickhouse/calculate-nfl-rankings?season=${season.year}&week=${week}`
          )
          
        } catch (err: any) {
          const errorMsg = `${season.year} Week ${week}: ${err.message}`
          console.error(`[AUTOPILOT] ❌ ${errorMsg}`)
          summary.errors.push(errorMsg)
        }
      }
      
      seasonSummary.duration_minutes = (Date.now() - seasonStart) / 1000 / 60
      summary.seasons_completed.push(seasonSummary)
      
      summary.total_weeks += seasonSummary.weeks_processed
      summary.total_games += seasonSummary.games
      summary.total_box_scores += seasonSummary.box_scores
      summary.total_team_stats += seasonSummary.team_stats
      
      console.log(`[AUTOPILOT] ✅ Season ${season.year} complete in ${seasonSummary.duration_minutes.toFixed(1)} min`)
    }
    
    const totalDuration = (Date.now() - startTime) / 1000 / 60
    
    console.log('\n[AUTOPILOT] ======= COMPLETE =======')
    console.log(`Total Duration: ${totalDuration.toFixed(1)} minutes`)
    console.log(`Total Games: ${summary.total_games}`)
    console.log(`Total Box Scores: ${summary.total_box_scores}`)
    console.log(`Total Team Stats: ${summary.total_team_stats}`)
    console.log(`Errors: ${summary.errors.length}`)
    
    return NextResponse.json({
      success: true,
      duration_minutes: totalDuration,
      ...summary
    })
    
  } catch (error: any) {
    console.error('[AUTOPILOT] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        duration_minutes: (Date.now() - startTime) / 1000 / 60
      },
      { status: 500 }
    )
  }
}

