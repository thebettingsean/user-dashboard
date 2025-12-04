import { NextResponse } from 'next/server'

/**
 * Ingest ALL NFL Historical Data
 * - 2024: All 18 weeks (completed season)
 * - 2025: Weeks 1-13 (current season through this week)
 */

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    console.log('[NFL Full Ingest] Starting complete historical ingestion...')
    
    const baseUrl = 'http://localhost:3003'
    const summary = {
      success: true,
      total_duration_ms: 0,
      seasons: {} as any
    }

    // Ingest 2024 (all 18 weeks)
    console.log('[NFL Full Ingest] 📅 Starting 2024 season (18 weeks)...')
    const start2024 = Date.now()
    
    const response2024 = await fetch(`${baseUrl}/api/clickhouse/ingest-nfl-history?season=2024`, {
      method: 'GET'
    })
    
    if (!response2024.ok) {
      throw new Error(`2024 ingestion failed: ${response2024.status}`)
    }
    
    const result2024 = await response2024.json()
    summary.seasons['2024'] = {
      ...result2024,
      duration_ms: Date.now() - start2024
    }
    
    console.log(`[NFL Full Ingest] ✅ 2024 complete: ${result2024.box_scores_inserted} box scores in ${Date.now() - start2024}ms`)

    // Ingest 2025 (weeks 1-13)
    console.log('[NFL Full Ingest] 📅 Starting 2025 season (weeks 1-13)...')
    const start2025 = Date.now()
    
    const response2025 = await fetch(`${baseUrl}/api/clickhouse/ingest-nfl-history?season=2025`, {
      method: 'GET'
    })
    
    if (!response2025.ok) {
      throw new Error(`2025 ingestion failed: ${response2025.status}`)
    }
    
    const result2025 = await response2025.json()
    summary.seasons['2025'] = {
      ...result2025,
      duration_ms: Date.now() - start2025
    }
    
    console.log(`[NFL Full Ingest] ✅ 2025 complete: ${result2025.box_scores_inserted} box scores in ${Date.now() - start2025}ms`)

    // Optimize tables
    console.log('[NFL Full Ingest] 🔧 Optimizing ClickHouse tables...')
    await fetch(`${baseUrl}/api/clickhouse/optimize`, { method: 'GET' })

    summary.total_duration_ms = Date.now() - startTime
    summary.total_box_scores = result2024.box_scores_inserted + result2025.box_scores_inserted
    summary.total_games = result2024.games_completed + result2025.games_completed

    console.log('[NFL Full Ingest] 🎉 COMPLETE!')
    console.log(`  Total Duration: ${(summary.total_duration_ms / 1000 / 60).toFixed(2)} minutes`)
    console.log(`  Total Games: ${summary.total_games}`)
    console.log(`  Total Box Scores: ${summary.total_box_scores}`)

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('[NFL Full Ingest] Fatal error:', error)
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

