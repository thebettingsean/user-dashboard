import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

interface Player {
  espn_player_id: number
  name: string
  position: string
  team_id: number
  headshot_url: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const position = searchParams.get('position') || ''
    const sport = searchParams.get('sport') || 'nfl'
    const limit = parseInt(searchParams.get('limit') || '20')

    let sql = `
      SELECT 
        espn_player_id,
        name,
        position,
        team_id,
        headshot_url
      FROM players
      WHERE sport = '${sport}'
        AND is_active = 1
    `

    // Filter by name search
    if (query && query.length > 0) {
      sql += ` AND lower(name) LIKE '%${query.toLowerCase()}%'`
    }

    // Filter by position
    if (position && position !== 'any') {
      sql += ` AND position = '${position}'`
    }

    sql += ` ORDER BY name ASC LIMIT ${limit}`

    const result = await clickhouseQuery<Player>(sql)

    return NextResponse.json({
      success: true,
      players: result.data || [],
      count: result.data?.length || 0
    })
  } catch (error: any) {
    console.error('Player search error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

