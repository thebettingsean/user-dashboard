/**
 * Fetch upcoming games for analyst pick submission
 * Returns games with team logos, game times, and game IDs
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY

// Map our sport names to Odds API sport keys
const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  cfb: 'americanfootball_ncaaf',
  cbb: 'basketball_ncaab',
}

// Sport emojis
const SPORT_EMOJI: Record<string, string> = {
  nfl: '🏈',
  nba: '🏀',
  cfb: '🏈',
  cbb: '🏀',
}

// Map frontend sport names to ClickHouse database sport names
const DB_SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  cfb: 'cfb',
  cbb: 'ncaab', // ClickHouse uses 'ncaab' for college basketball
}

interface OddsAPIGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: any[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    if (!SPORT_MAP[sport]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sport. Must be: nfl, nba, cfb, or cbb'
      }, { status: 400 })
    }

    if (!ODDS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured'
      }, { status: 500 })
    }

    // Fetch upcoming games from Odds API
    const oddsApiSport = SPORT_MAP[sport]
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    
    console.log(`[${sport.toUpperCase()}] Fetching from Odds API...`)
    const oddsResponse = await fetch(oddsUrl, { 
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const games: OddsAPIGame[] = await oddsResponse.json()
    console.log(`[${sport.toUpperCase()}] Got ${games.length} games from Odds API`)

    // Fetch team logos from ClickHouse
    console.log(`[${sport.toUpperCase()}] Fetching team data from ClickHouse...`)
    const dbSport = DB_SPORT_MAP[sport] || sport
    console.log(`[${sport.toUpperCase()}] Querying ClickHouse for sport: '${dbSport}'`)
    const teamLogosQuery = await clickhouseQuery<{
      team_id: number
      espn_team_id: number
      team_name: string
      logo_url: string
      abbreviation: string
    }>(`
      SELECT 
        team_id,
        espn_team_id,
        name as team_name,
        logo_url,
        abbreviation
      FROM teams
      WHERE LOWER(sport) = '${dbSport}' AND logo_url != ''
    `)
    
    console.log(`[${sport.toUpperCase()}] ClickHouse query success: ${teamLogosQuery.success}`)
    console.log(`[${sport.toUpperCase()}] Found ${teamLogosQuery.data?.length || 0} teams with logos`)
    
    if (!teamLogosQuery.success || !teamLogosQuery.data || teamLogosQuery.data.length === 0) {
      console.error(`[${sport.toUpperCase()}] ⚠️ WARNING: No teams found in ClickHouse!`)
      console.error(`[${sport.toUpperCase()}] Query error:`, teamLogosQuery.error)
    } else {
      // Log first few teams for debugging
      console.log(`[${sport.toUpperCase()}] Sample teams:`, teamLogosQuery.data.slice(0, 3).map(t => ({
        name: t.team_name,
        abbr: t.abbreviation,
        has_logo: !!t.logo_url
      })))
    }

    // Create comprehensive mapping of team names
    const teamLogos = new Map()
    console.log(`[${sport.toUpperCase()}] Creating team mappings...`)
    
    teamLogosQuery.data?.forEach(team => {
      // Map by various name formats
      const teamName = team.team_name.toLowerCase()
      const abbr = team.abbreviation?.toLowerCase()
      
      // Store by full name (e.g., "tampa bay buccaneers")
      teamLogos.set(teamName, team)
      
      // Store by abbreviation (e.g., "tb", "pit")
      if (abbr) {
        teamLogos.set(abbr, team)
      }
      
      // Store by last word (e.g., "buccaneers", "steelers")
      const lastWord = teamName.split(' ').pop()
      if (lastWord) {
        teamLogos.set(lastWord, team)
      }
      
      // For names with "St." or numbers, also store alternate versions
      const cleanName = teamName.replace(/st\./gi, 'saint').replace(/\./g, '')
      if (cleanName !== teamName) {
        teamLogos.set(cleanName, team)
      }
    })
    
    console.log(`[${sport.toUpperCase()}] Created ${teamLogos.size} team name variations`)

    // Helper function to find team with flexible matching
    const findTeam = (oddsApiName: string) => {
      const lower = oddsApiName.toLowerCase().trim()
      
      // Try exact match first
      if (teamLogos.has(lower)) {
        return teamLogos.get(lower)
      }
      
      // Clean the name (remove special chars)
      const cleaned = lower.replace(/\./g, '').replace(/st /gi, 'saint ')
      if (teamLogos.has(cleaned)) {
        return teamLogos.get(cleaned)
      }
      
      // Try last word match (e.g., "Buccaneers" from "Tampa Bay Buccaneers")
      const words = lower.split(' ')
      const lastWord = words[words.length - 1]
      if (teamLogos.has(lastWord)) {
        return teamLogos.get(lastWord)
      }
      
      // Try abbreviation match (e.g., "TB" from "Tampa Bay")
      if (words.length > 1) {
        const abbr = words.map(w => w[0]).join('')
        if (teamLogos.has(abbr)) {
          return teamLogos.get(abbr)
        }
      }
      
      // Try partial match - any key that contains or is contained in the search
      for (const [key, value] of teamLogos.entries()) {
        if (lower.includes(key) || key.includes(lower)) {
          // Prioritize longer matches
          if (key.length > 3) {
            return value
          }
        }
      }
      
      // Last resort: try partial match with short keys
      for (const [key, value] of teamLogos.entries()) {
        if (lower.includes(key) || key.includes(lower)) {
          return value
        }
      }
      
      return null
    }

    // Match games with team data
    const gamesWithLogos = games.map(game => {
      const homeTeam = findTeam(game.home_team)
      const awayTeam = findTeam(game.away_team)

      // Log if we couldn't find team logos
      if (!homeTeam) {
        console.log(`[${sport.toUpperCase()}] ❌ Could not find home team: "${game.home_team}"`)
      } else {
        console.log(`[${sport.toUpperCase()}] ✅ Found home team: "${game.home_team}" → ${homeTeam.team_name} (${homeTeam.logo_url ? 'HAS LOGO' : 'NO LOGO'})`)
      }
      if (!awayTeam) {
        console.log(`[${sport.toUpperCase()}] ❌ Could not find away team: "${game.away_team}"`)
      } else {
        console.log(`[${sport.toUpperCase()}] ✅ Found away team: "${game.away_team}" → ${awayTeam.team_name} (${awayTeam.logo_url ? 'HAS LOGO' : 'NO LOGO'})`)
      }

      // Generate game_id in format: NFL-20251225-DEN-KC
      const gameDate = new Date(game.commence_time)
      const dateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '')
      const homeAbbr = homeTeam?.abbreviation || game.home_team.substring(0, 3).toUpperCase()
      const awayAbbr = awayTeam?.abbreviation || game.away_team.substring(0, 3).toUpperCase()
      const gameId = `${sport.toUpperCase()}-${dateStr}-${awayAbbr}-${homeAbbr}`

      return {
        game_id: gameId,
        odds_api_id: game.id,
        sport: sport.toUpperCase(),
        sport_emoji: SPORT_EMOJI[sport],
        home_team: game.home_team,
        away_team: game.away_team,
        home_team_abbr: homeAbbr,
        away_team_abbr: awayAbbr,
        home_team_logo: homeTeam?.logo_url || null,
        away_team_logo: awayTeam?.logo_url || null,
        game_time: game.commence_time,
        game_time_est: new Date(game.commence_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        has_odds: game.bookmakers && game.bookmakers.length > 0
      }
    })

    console.log(`[${sport.toUpperCase()}] Returning ${gamesWithLogos.length} games`)

    // Sort by game time (soonest first)
    gamesWithLogos.sort((a, b) => 
      new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    )

    return NextResponse.json({
      success: true,
      sport,
      games: gamesWithLogos,
      total: gamesWithLogos.length
    })

  } catch (error: any) {
    console.error('[ANALYST PICKS] Error fetching upcoming games:', error)
    console.error('[ANALYST PICKS] Error stack:', error.stack)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

