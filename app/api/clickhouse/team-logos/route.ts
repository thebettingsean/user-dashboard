import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// Cache logos in memory - they never change
let cachedLogos: { espn_team_id: number; logo_url: string }[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export async function GET() {
  try {
    // Return cached logos if still valid
    const now = Date.now()
    if (cachedLogos && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        logos: cachedLogos,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      })
    }

    const result = await clickhouseQuery<{ espn_team_id: number; logo_url: string }>(`
      SELECT espn_team_id, logo_url 
      FROM teams 
      WHERE sport = 'nfl' AND logo_url != ''
    `)
    
    // Update cache
    cachedLogos = result.data
    cacheTimestamp = now
    
    return NextResponse.json({
      success: true,
      logos: result.data
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error: any) {
    console.error('Error fetching team logos:', error)
    
    // If we have cached logos, return them even if stale
    if (cachedLogos) {
      return NextResponse.json({
        success: true,
        logos: cachedLogos,
        stale: true
      })
    }
    
    // Return empty array instead of error to prevent breaking the page
    return NextResponse.json({
      success: false,
      logos: [],
      error: error.message
    })
  }
}

