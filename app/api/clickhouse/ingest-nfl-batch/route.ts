import { NextResponse } from 'next/server'

/**
 * Ingest NFL Data in Batches
 * Query params: season, startWeek, endWeek
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2025'
  const startWeek = parseInt(searchParams.get('startWeek') || '1')
  const endWeek = parseInt(searchParams.get('endWeek') || '5')
  
  const startTime = Date.now()
  
  try {
    console.log(`[NFL Batch] Starting ${season} weeks ${startWeek}-${endWeek}...`)
    
    const baseUrl = 'http://localhost:3003'
    const weekResults = []
    
    for (let week = startWeek; week <= endWeek; week++) {
      const weekStart = Date.now()
      console.log(`[NFL Batch] Processing week ${week}...`)
      
      try {
        const response = await fetch(
          `${baseUrl}/api/clickhouse/ingest-nfl-history?season=${season}&week=${week}`,
          { method: 'GET' }
        )
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()
        weekResults.push({
          week,
          success: result.success,
          games: result.games_completed,
          players: result.players_with_stats,
          box_scores: result.box_scores_inserted,
          errors: result.errors?.length || 0,
          duration_ms: Date.now() - weekStart
        })
        
        console.log(`[NFL Batch] ✅ Week ${week}: ${result.box_scores_inserted} box scores in ${Date.now() - weekStart}ms`)
        
      } catch (err: any) {
        console.error(`[NFL Batch] ❌ Week ${week} failed:`, err.message)
        weekResults.push({
          week,
          success: false,
          error: err.message,
          duration_ms: Date.now() - weekStart
        })
      }
    }
    
    const totalDuration = Date.now() - startTime
    const totalBoxScores = weekResults.reduce((sum, r) => sum + (r.box_scores || 0), 0)
    const totalGames = weekResults.reduce((sum, r) => sum + (r.games || 0), 0)
    const failedWeeks = weekResults.filter(r => !r.success).length
    
    console.log(`[NFL Batch] Batch complete: ${totalBoxScores} box scores from ${totalGames} games in ${totalDuration}ms`)
    
    return NextResponse.json({
      success: failedWeeks === 0,
      season: parseInt(season),
      week_range: `${startWeek}-${endWeek}`,
      total_duration_ms: totalDuration,
      total_games: totalGames,
      total_box_scores: totalBoxScores,
      failed_weeks: failedWeeks,
      week_results: weekResults
    })
    
  } catch (error: any) {
    console.error('[NFL Batch] Fatal error:', error)
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

