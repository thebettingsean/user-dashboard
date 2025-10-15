// app/api/widget-data/matchup/route.ts
import { NextResponse } from 'next/server'
import { getMatchupWidgetData } from '@/lib/api/widgetData'

// Simple in-memory cache with 30-minute TTL
let cachedData: any = null
let cacheTimestamp: number = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if it's still fresh
    if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('📦 Returning cached matchup widget data')
      return NextResponse.json(cachedData)
    }
    
    console.log('🔄 Fetching fresh matchup widget data...')
    const data = await getMatchupWidgetData()
    
    // Update cache
    cachedData = data
    cacheTimestamp = now
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in matchup widget API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matchup widget data' },
      { status: 500 }
    )
  }
}

// Disable Next.js static optimization for this route
export const dynamic = 'force-dynamic'
