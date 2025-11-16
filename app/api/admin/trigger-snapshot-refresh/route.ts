import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/trigger-snapshot-refresh
 * Manually trigger the snapshot refresh cron (for testing)
 * This just redirects to the cron endpoint with the proper auth
 */
export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin') || 'https://dashboard.thebettinginsider.com'
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    console.log('🔄 Manually triggering snapshot refresh...')

    // Call the cron endpoint internally
    const response = await fetch(`${origin}/api/cron/refresh-game-snapshots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Cron call failed:', data)
      return NextResponse.json({ 
        error: 'Cron call failed', 
        details: data 
      }, { status: response.status })
    }

    console.log('✅ Snapshot refresh completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Snapshot refresh triggered successfully',
      results: data
    })

  } catch (error: any) {
    console.error('❌ Error triggering snapshot refresh:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger refresh' },
      { status: 500 }
    )
  }
}

