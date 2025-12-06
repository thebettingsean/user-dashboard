import { NextResponse } from 'next/server'

// Vercel Cron: Run every hour
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max

export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    console.log('🕐 Starting hourly upcoming odds sync...')
    
    // Call the sync endpoint
    const response = await fetch(`${baseUrl}/api/clickhouse/sync-upcoming-games?props=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Sync failed: ${text}`)
    }
    
    const result = await response.json()
    
    console.log('✅ Sync completed:', result)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })
    
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

