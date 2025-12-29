/**
 * Search for players by name
 * Returns players matching the search query with their info
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')?.toLowerCase() || ''
    const sport = searchParams.get('sport')?.toUpperCase() || ''

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters'
      }, { status: 400 })
    }

    if (!sport || (sport !== 'NFL' && sport !== 'NBA')) {
      return NextResponse.json({
        success: false,
        error: 'Sport must be NFL or NBA'
      }, { status: 400 })
    }

    // Search players in ClickHouse
    const playersResult = await clickhouseQuery<{
      name: string
      position: string
      team: string
      headshot_url: string
      injury_status: string
    }>(`
      SELECT 
        name,
        position,
        team,
        headshot_url,
        injury_status
      FROM players
      WHERE sport = '${sport}'
        AND is_active = true
        AND LOWER(name) LIKE '%${query}%'
      ORDER BY name
      LIMIT 20
    `)

    return NextResponse.json({
      success: true,
      players: playersResult.data || [],
      total: playersResult.data?.length || 0
    })

  } catch (error: any) {
    console.error('[PLAYER SEARCH] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

