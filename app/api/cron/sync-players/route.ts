import { NextResponse } from 'next/server'

/**
 * Cron Job: Sync NFL & NBA Players and Teams
 * Schedule: Every 6 hours
 * Purpose: Update rosters, injury statuses, and team info
 */

export async function GET(request: Request) {
  try {
    // Validate cron secret (skip in development)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (!isDevelopment) {
      if (!cronSecret) {
        console.error('[Cron Sync] CRON_SECRET not configured')
        return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[Cron Sync] Invalid authorization')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log('[Cron Sync] Running in development mode, skipping auth')
    }

    console.log('[Cron Sync] Starting player sync job...')
    const startTime = Date.now()

    // Get the base URL for internal API calls
    const baseUrl = isDevelopment 
      ? 'http://localhost:3003' 
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://bettingdashboard.vercel.app')

    // Sync NFL
    console.log('[Cron Sync] Syncing NFL players and teams...')
    const nflResponse = await fetch(`${baseUrl}/api/clickhouse/sync-nfl-players`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!nflResponse.ok) {
      throw new Error(`NFL sync failed: ${nflResponse.status}`)
    }

    const nflResult = await nflResponse.json()
    console.log('[Cron Sync] NFL sync complete:', nflResult)

    // Sync NBA
    console.log('[Cron Sync] Syncing NBA players and teams...')
    const nbaResponse = await fetch(`${baseUrl}/api/clickhouse/sync-nba-players`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!nbaResponse.ok) {
      throw new Error(`NBA sync failed: ${nbaResponse.status}`)
    }

    const nbaResult = await nbaResponse.json()
    console.log('[Cron Sync] NBA sync complete:', nbaResult)

    // Optimize tables to deduplicate
    console.log('[Cron Sync] Optimizing ClickHouse tables...')
    const optimizeResponse = await fetch(`${baseUrl}/api/clickhouse/optimize`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!optimizeResponse.ok) {
      console.warn('[Cron Sync] Optimization failed, but continuing...')
    }

    const duration = Date.now() - startTime

    const summary = {
      success: true,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      results: {
        nfl: {
          teams_synced: nflResult.teams_synced,
          players_synced: nflResult.players_synced,
          injuries_updated: nflResult.injuries_updated,
          errors: nflResult.errors
        },
        nba: {
          teams_synced: nbaResult.teams_synced,
          players_synced: nbaResult.players_synced,
          injuries_updated: nbaResult.injuries_updated,
          errors: nbaResult.errors
        }
      }
    }

    console.log('[Cron Sync] Job complete:', summary)

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('[Cron Sync] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}

