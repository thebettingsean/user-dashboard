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
    
    const oddsResponse = await fetch(oddsUrl)
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const games: OddsAPIGame[] = await oddsResponse.json()

    // Fetch team logos from ClickHouse
    const teamLogosQuery = await clickhouseQuery<{
      team_name: string
      logo_url: string
      abbreviation: string
      espn_display_name: string
    }>(`
      SELECT 
        name as team_name,
        logo as logo_url,
        abbreviation,
        espn_display_name
      FROM teams
      WHERE sport = '${sport.toUpperCase()}'
    `)

    const teamLogos = new Map()
    teamLogosQuery.data?.forEach(team => {
      // Map by various name formats
      teamLogos.set(team.team_name.toLowerCase(), team)
      teamLogos.set(team.espn_display_name?.toLowerCase(), team)
      teamLogos.set(team.abbreviation?.toLowerCase(), team)
    })

    // Match games with team data
    const gamesWithLogos = games.map(game => {
      const homeTeam = teamLogos.get(game.home_team.toLowerCase()) || 
                       teamLogos.get(game.home_team.replace(/\s+/g, '').toLowerCase())
      const awayTeam = teamLogos.get(game.away_team.toLowerCase()) ||
                       teamLogos.get(game.away_team.replace(/\s+/g, '').toLowerCase())

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
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

