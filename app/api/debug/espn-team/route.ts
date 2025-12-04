import { NextResponse } from 'next/server'

const ESPN_NFL_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId') || '12' // Chiefs by default

  try {
    const response = await fetch(`${ESPN_NFL_URL}/teams/${teamId}`)
    const data = await response.json()

    // Extract what we need
    const extracted = {
      name: data.team?.displayName,
      location: data.team?.location,
      abbreviation: data.team?.abbreviation,
      logo: data.team?.logo,
      logos: data.team?.logos,
      color: data.team?.color,
      alternateColor: data.team?.alternateColor,
      
      // Check different possible paths for division/conference
      groups: data.team?.groups,
      conference: data.team?.conference,
      division: data.team?.division,
      
      // Show entire team object structure
      team_keys: Object.keys(data.team || {})
    }

    return NextResponse.json({
      extracted,
      full_response: data
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

