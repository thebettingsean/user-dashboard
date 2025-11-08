// app/api/widget-data/stats/route.ts
import { NextResponse } from 'next/server'
import { getStatsWidgetData } from '@/lib/api/widgetData'

// Simple in-memory cache with 30-minute TTL
let cachedData: any = null
let cacheTimestamp: number = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

export async function GET(request: Request) {
  try {
    // Get sport from query params
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') as 'nfl' | 'nba' | 'nhl' | 'cfb' | null
    
    const now = Date.now()
    const cacheKey = sport || 'default'
    
    // Simple cache per sport
    if (!cachedData) cachedData = {}
    
    // Return cached data if it's still fresh for this sport
    if (cachedData[cacheKey] && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`📦 Returning cached stats widget data for ${sport || 'default'}`)
      return NextResponse.json(cachedData[cacheKey])
    }
    
    console.log(`🔄 Fetching fresh stats widget data for ${sport || 'default'}...`)
    const data = sport ? await getStatsWidgetData(sport) : await getStatsWidgetData()
    
    // Update cache
    cachedData[cacheKey] = data
    cacheTimestamp = now
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in stats widget API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats widget data' },
      { status: 500 }
    )
  }
}

// Disable Next.js static optimization for this route
export const dynamic = 'force-dynamic'
