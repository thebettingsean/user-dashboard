import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const result = await clickhouseQuery<{ espn_team_id: number; logo_url: string }>(`
      SELECT espn_team_id, logo_url 
      FROM teams 
      WHERE sport = 'nfl' AND logo_url != ''
    `)
    
    return NextResponse.json({
      success: true,
      logos: result.data
    })
  } catch (error: any) {
    console.error('Error fetching team logos:', error)
    // Return empty array instead of error to prevent breaking the page
    // Team logos are optional - the page works fine without them
    return NextResponse.json({
      success: false,
      logos: [],
      error: error.message
    })
  }
}

