import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') || 'nfl'

    // Fetch teams from ClickHouse
    const teamLogosQuery = await clickhouseQuery<{
      team_name: string
      logo_url: string
      abbreviation: string
    }>(`
      SELECT 
        name as team_name,
        logo_url,
        abbreviation
      FROM teams
      WHERE sport = '${sport.toUpperCase()}'
    `)

    // Test Odds API team names
    const testNames = [
      'Tampa Bay Buccaneers',
      'Green Bay Packers',
      'Kansas City Chiefs',
      'Miami Dolphins',
      'Arizona Cardinals',
      'Cincinnati Bengals',
      'Baltimore Ravens'
    ]

    const teamLogos = new Map()
    teamLogosQuery.data?.forEach(team => {
      const teamName = team.team_name.toLowerCase()
      const abbr = team.abbreviation?.toLowerCase()
      
      teamLogos.set(teamName, team)
      if (abbr) teamLogos.set(abbr, team)
      
      const lastWord = teamName.split(' ').pop()
      if (lastWord) teamLogos.set(lastWord, team)
    })

    const findTeam = (oddsApiName: string) => {
      const lower = oddsApiName.toLowerCase()
      
      if (teamLogos.has(lower)) return teamLogos.get(lower)
      
      const words = lower.split(' ')
      if (words.length > 1) {
        const abbr = words.map(w => w[0]).join('')
        if (teamLogos.has(abbr)) return teamLogos.get(abbr)
      }
      
      const lastWord = words[words.length - 1]
      if (teamLogos.has(lastWord)) return teamLogos.get(lastWord)
      
      for (const [key, value] of teamLogos.entries()) {
        if (lower.includes(key) || key.includes(lower)) {
          return value
        }
      }
      
      return null
    }

    const results = testNames.map(name => ({
      oddsApiName: name,
      matched: findTeam(name) ? 'YES' : 'NO',
      matchedTeam: findTeam(name)?.team_name || 'Not found',
      logo: findTeam(name)?.logo_url || null
    }))

    return NextResponse.json({
      sport: sport.toUpperCase(),
      teamsInDatabase: teamLogosQuery.data?.length || 0,
      availableKeys: Array.from(teamLogos.keys()).sort(),
      testResults: results
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

