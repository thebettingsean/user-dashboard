import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const nflTeams = await clickhouseQuery(`
      SELECT name, abbreviation, division, conference, logo_url 
      FROM teams 
      WHERE sport = 'nfl' 
      ORDER BY name 
      LIMIT 10
    `)

    const nbaTeams = await clickhouseQuery(`
      SELECT name, abbreviation, division, conference, logo_url 
      FROM teams 
      WHERE sport = 'nba' 
      ORDER BY name 
      LIMIT 10
    `)

    return NextResponse.json({
      success: true,
      nfl_teams: nflTeams,
      nba_teams: nbaTeams
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

