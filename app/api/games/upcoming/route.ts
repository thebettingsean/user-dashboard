/**
 * Unified Games API - Fetches upcoming games with all data
 * Data sources:
 * - Games & Odds: Odds API (api.the-odds-api.com)
 * - Team Logos: ClickHouse teams table
 * - Public Betting: ClickHouse games table (from sportsdataio)
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
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
}

// Map frontend sport names to ClickHouse database sport names
const DB_SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  cfb: 'cfb',
  cbb: 'ncaab',
  nhl: 'nhl',
  mlb: 'mlb',
}

interface OddsAPIGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: Array<{
    key: string
    title: string
    markets: Array<{
      key: string
      outcomes: Array<{
        name: string
        price: number
        point?: number
      }>
    }>
  }>
}

interface TeamData {
  team_id: number
  espn_team_id: number
  team_name: string
  logo_url: string
  abbreviation: string
  primary_color: string | null
  secondary_color: string | null
}

interface PublicBettingData {
  odds_api_game_id: string
  public_spread_home_bet_pct: number | null
  public_spread_home_money_pct: number | null
  public_ml_home_bet_pct: number | null
  public_ml_home_money_pct: number | null
  public_total_over_bet_pct: number | null
  public_total_over_money_pct: number | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    if (!SPORT_MAP[sport]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sport. Must be: nfl, nba, cfb, cbb, nhl, or mlb'
      }, { status: 400 })
    }

    if (!ODDS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured'
      }, { status: 500 })
    }

    // 1. Fetch games + odds from Odds API
    const oddsApiSport = SPORT_MAP[sport]
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    
    console.log(`[GAMES API - ${sport.toUpperCase()}] Fetching from Odds API...`)
    const oddsResponse = await fetch(oddsUrl, { 
      signal: AbortSignal.timeout(10000),
      cache: 'no-store'
    })
    
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const oddsApiGames: OddsAPIGame[] = await oddsResponse.json()
    console.log(`[GAMES API - ${sport.toUpperCase()}] Got ${oddsApiGames.length} games from Odds API`)

    // 2. Fetch team logos and colors from ClickHouse
    const dbSport = DB_SPORT_MAP[sport] || sport
    const teamLogosQuery = await clickhouseQuery<TeamData>(`
      SELECT 
        team_id,
        espn_team_id,
        name as team_name,
        logo_url,
        abbreviation,
        primary_color,
        secondary_color
      FROM teams
      WHERE LOWER(sport) = '${dbSport}' AND logo_url != ''
    `)
    
    console.log(`[GAMES API - ${sport.toUpperCase()}] Found ${teamLogosQuery.data?.length || 0} teams in ClickHouse`)

    // 3. Fetch public betting data from ClickHouse (if available)
    const gameIds = oddsApiGames.map(g => g.id)
    let publicBettingMap = new Map<string, PublicBettingData>()
    
    if (gameIds.length > 0) {
      try {
        const publicBettingQuery = await clickhouseQuery<PublicBettingData>(`
          SELECT 
            odds_api_game_id,
            public_spread_home_bet_pct,
            public_spread_home_money_pct,
            public_ml_home_bet_pct,
            public_ml_home_money_pct,
            public_total_over_bet_pct,
            public_total_over_money_pct
          FROM games
          WHERE odds_api_game_id IN (${gameIds.map(id => `'${id}'`).join(',')})
            AND sport = '${sport}'
        `)
        
        if (publicBettingQuery.success && publicBettingQuery.data) {
          publicBettingQuery.data.forEach(pb => {
            publicBettingMap.set(pb.odds_api_game_id, pb)
          })
          console.log(`[GAMES API - ${sport.toUpperCase()}] Found public betting for ${publicBettingMap.size} games`)
        }
      } catch (error) {
        console.log(`[GAMES API - ${sport.toUpperCase()}] No public betting data available (table may not exist for this sport)`)
      }
    }

    // Create team lookup map
    const teamLogos = new Map<string, TeamData>()
    teamLogosQuery.data?.forEach(team => {
      const teamName = team.team_name.toLowerCase()
      const abbr = team.abbreviation?.toLowerCase()
      
      teamLogos.set(teamName, team)
      if (abbr) teamLogos.set(abbr, team)
      
      const lastWord = teamName.split(' ').pop()
      if (lastWord) teamLogos.set(lastWord, team)
      
      const cleanName = teamName.replace(/st\./gi, 'saint').replace(/\./g, '')
      if (cleanName !== teamName) teamLogos.set(cleanName, team)
    })

    // Helper to find team
    const findTeam = (oddsApiName: string): TeamData | null => {
      const lower = oddsApiName.toLowerCase().trim()
      
      if (teamLogos.has(lower)) return teamLogos.get(lower)!
      
      const cleaned = lower.replace(/\./g, '').replace(/st /gi, 'saint ')
      if (teamLogos.has(cleaned)) return teamLogos.get(cleaned)!
      
      const words = lower.split(' ')
      const lastWord = words[words.length - 1]
      if (teamLogos.has(lastWord)) return teamLogos.get(lastWord)!
      
      for (const [key, value] of teamLogos.entries()) {
        if (lower.includes(key) || key.includes(lower)) {
          if (key.length > 3) return value
        }
      }
      
      return null
    }

    // Extract odds from bookmakers (prefer FanDuel, then DraftKings, then first available)
    const extractOdds = (bookmakers: OddsAPIGame['bookmakers']) => {
      if (!bookmakers || bookmakers.length === 0) return null

      const preferredBooks = ['fanduel', 'draftkings', 'betmgm', 'caesars']
      let bookmaker = bookmakers.find(b => preferredBooks.includes(b.key))
      if (!bookmaker) bookmaker = bookmakers[0]

      const spread = bookmaker.markets.find(m => m.key === 'spreads')
      const totals = bookmaker.markets.find(m => m.key === 'totals')
      const moneyline = bookmaker.markets.find(m => m.key === 'h2h')

      return {
        spread: spread ? {
          homePoint: spread.outcomes.find(o => o.name.toLowerCase().includes('home') || 
            o.point !== undefined)?.point || null,
          awayPoint: spread.outcomes.find(o => o.name.toLowerCase().includes('away') || 
            o.point !== undefined)?.point || null,
          // Get actual points from outcomes
          home: spread.outcomes[1]?.point || null,
          away: spread.outcomes[0]?.point || null,
        } : null,
        totals: totals ? {
          number: totals.outcomes[0]?.point || null,
        } : null,
        moneyline: moneyline ? {
          home: moneyline.outcomes[1]?.price || null,
          away: moneyline.outcomes[0]?.price || null,
        } : null,
        sportsbook: bookmaker.title,
      }
    }

    // Build final games array
    const games = oddsApiGames.map(game => {
      const homeTeam = findTeam(game.home_team)
      const awayTeam = findTeam(game.away_team)
      const odds = extractOdds(game.bookmakers)
      const publicBetting = publicBettingMap.get(game.id)

      const homeAbbr = homeTeam?.abbreviation || game.home_team.substring(0, 3).toUpperCase()
      const awayAbbr = awayTeam?.abbreviation || game.away_team.substring(0, 3).toUpperCase()

      return {
        id: game.id,
        sport: sport.toUpperCase(),
        awayTeam: game.away_team,
        homeTeam: game.home_team,
        awayTeamAbbr: awayAbbr,
        homeTeamAbbr: homeAbbr,
        awayTeamLogo: awayTeam?.logo_url || null,
        homeTeamLogo: homeTeam?.logo_url || null,
        awayTeamColor: awayTeam?.primary_color || null,
        homeTeamColor: homeTeam?.primary_color || null,
        kickoff: game.commence_time,
        kickoffLabel: new Date(game.commence_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        // Odds
        spread: odds?.spread ? {
          homeLine: odds.spread.home,
          awayLine: odds.spread.away,
        } : null,
        totals: odds?.totals ? {
          number: odds.totals.number,
        } : null,
        moneyline: odds?.moneyline || null,
        sportsbook: odds?.sportsbook || null,
        // Public Betting (from sportsdataio via ClickHouse)
        publicBetting: publicBetting ? {
          spreadHomeBetPct: publicBetting.public_spread_home_bet_pct,
          spreadHomeMoneyPct: publicBetting.public_spread_home_money_pct,
          mlHomeBetPct: publicBetting.public_ml_home_bet_pct,
          mlHomeMoneyPct: publicBetting.public_ml_home_money_pct,
          totalOverBetPct: publicBetting.public_total_over_bet_pct,
          totalOverMoneyPct: publicBetting.public_total_over_money_pct,
        } : null,
        hasPublicBetting: !!publicBetting,
      }
    })

    // Sort by kickoff (soonest first)
    games.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())

    console.log(`[GAMES API - ${sport.toUpperCase()}] Returning ${games.length} games`)

    return NextResponse.json({
      success: true,
      sport: sport.toUpperCase(),
      games,
      total: games.length,
      dataSources: {
        games: 'Odds API',
        logos: 'ClickHouse teams table',
        publicBetting: 'SportsDataIO (via ClickHouse)',
      }
    })

  } catch (error: any) {
    console.error('[GAMES API] Error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

