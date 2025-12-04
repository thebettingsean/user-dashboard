import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const result = await clickhouseQuery(`
      SELECT 
        referee_name,
        COUNT(*) as game_count
      FROM nfl_games
      WHERE referee_name != '' AND referee_name IS NOT NULL
      GROUP BY referee_name
      ORDER BY game_count DESC
    `)
    
    return NextResponse.json({
      success: true,
      referees: result.data || []
    })
  } catch (error: any) {
    console.error('Error fetching referees:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

