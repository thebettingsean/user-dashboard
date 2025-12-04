import { NextResponse } from 'next/server'

/**
 * Ingest NFL Season in Batches
 * Automatically runs complete ingestion + rankings for each week
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2022'
  const startWeek = parseInt(searchParams.get('startWeek') || '1')
  const endWeek = parseInt(searchParams.get('endWeek') || '5')
  
  const startTime = Date.now()
  const baseUrl = 'http://localhost:3003'
  
  try {
    console.log(`[NFL Season Ingest] Starting ${season} weeks ${startWeek}-${endWeek}...`)
    
    const weekResults = []
    
    for (let week = startWeek; week <= endWeek; week++) {
      const weekStart = Date.now()
      console.log(`[NFL Season Ingest] Processing week ${week}...`)
      
      try {
        // Ingest week data
        const ingestRes = await fetch(
          `${baseUrl}/api/clickhouse/ingest-nfl-complete?season=${season}&week=${week}`
        )
        
        if (!ingestRes.ok) {
          throw new Error(`Ingest failed: ${ingestRes.status}`)
        }
        
        const ingestResult = await ingestRes.json()
        
        // Calculate rankings for this week
        const rankingsRes = await fetch(
          `${baseUrl}/api/clickhouse/calculate-nfl-rankings?season=${season}&week=${week}`
        )
        
        const rankingsResult = rankingsRes.ok ? await rankingsRes.json() : { success: false }
        
        weekResults.push({
          week,
          games: ingestResult.games_inserted,
          team_stats: ingestResult.team_stats_inserted,
          box_scores: ingestResult.box_scores_inserted,
          rankings_calculated: rankingsResult.success,
          duration_ms: Date.now() - weekStart
        })
        
        console.log(`[NFL Season Ingest] ✅ Week ${week}: ${ingestResult.box_scores_inserted} box scores in ${(Date.now() - weekStart)/1000}s`)
        
      } catch (err: any) {
        console.error(`[NFL Season Ingest] ❌ Week ${week} failed:`, err.message)
        weekResults.push({
          week,
          success: false,
          error: err.message
        })
      }
    }
    
    const totalDuration = Date.now() - startTime
    const totalBoxScores = weekResults.reduce((sum, r) => sum + (r.box_scores || 0), 0)
    const totalGames = weekResults.reduce((sum, r) => sum + (r.games || 0), 0)
    
    return NextResponse.json({
      success: true,
      season: parseInt(season),
      week_range: `${startWeek}-${endWeek}`,
      total_duration_ms: totalDuration,
      total_games: totalGames,
      total_box_scores: totalBoxScores,
      week_results: weekResults
    })
    
  } catch (error: any) {
    console.error('[NFL Season Ingest] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

