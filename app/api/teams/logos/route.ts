import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    // Query teams table directly for all teams in the sport
    const teamsQuery = `
      SELECT 
        name,
        logo_url,
        abbreviation
      FROM teams
      WHERE sport = '${sport}'
      ORDER BY name
    `

    const result = await clickhouseQuery<any>(teamsQuery)

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: true,
        teams: {},
        message: 'No teams found'
      })
    }

    // Create a map of team name -> logo_url
    const teamsMap: Record<string, string | null> = {}
    result.data.forEach((row: any) => {
      if (row.name && row.logo_url) {
        teamsMap[row.name] = row.logo_url
      }
      // Also add by abbreviation for flexibility
      if (row.abbreviation && row.logo_url) {
        teamsMap[row.abbreviation] = row.logo_url
      }
    })

    return NextResponse.json({
      success: true,
      teams: teamsMap
    })
  } catch (error) {
    console.error('Failed to fetch team logos:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch team logos',
      teams: {}
    }, { status: 500 })
  }
}

