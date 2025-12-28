/**
 * Fetch player props for a specific game and team
 * Supports NFL and NBA only (CFB/CBB don't have props)
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY

// Map our sport names to Odds API sport keys
const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
}

// Prop markets to fetch
const PROP_MARKETS = [
  'player_pass_tds',
  'player_pass_yds',
  'player_rush_yds',
  'player_receptions',
  'player_reception_yds',
  'player_anytime_td',
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_points_rebounds_assists'
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const oddsApiId = searchParams.get('oddsApiId')
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'
    const position = searchParams.get('position')?.toLowerCase() // qb, wr, rb, etc.

    if (!oddsApiId) {
      return NextResponse.json({
        success: false,
        error: 'oddsApiId parameter required'
      }, { status: 400 })
    }

    if (sport !== 'nfl' && sport !== 'nba') {
      return NextResponse.json({
        success: false,
        error: 'Props only available for NFL and NBA'
      }, { status: 400 })
    }

    if (!ODDS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured'
      }, { status: 500 })
    }

    // Fetch props from Odds API
    const oddsApiSport = SPORT_MAP[sport]
    const marketsParam = PROP_MARKETS.join(',')
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${oddsApiId}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    const oddsResponse = await fetch(oddsUrl)
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const gameData = await oddsResponse.json()

    // Fetch player data from ClickHouse (images, positions, teams)
    const playersQuery = await clickhouseQuery<{
      name: string
      position: string
      team: string
      headshot_url: string
      injury_status: string
    }>(`
      SELECT 
        name,
        position,
        team,
        headshot_url,
        injury_status
      FROM players
      WHERE sport = '${sport.toUpperCase()}'
        AND is_active = true
        ${position ? `AND LOWER(position) = '${position}'` : ''}
      ORDER BY name
    `)

    // Create player lookup map
    const playerMap = new Map()
    playersQuery.data?.forEach(player => {
      // Normalize name for matching (remove Jr., Sr., periods, etc.)
      const normalized = player.name
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/ jr$/i, '')
        .replace(/ sr$/i, '')
        .replace(/ ii$/i, '')
        .replace(/ iii$/i, '')
        .trim()
      
      playerMap.set(normalized, player)
      playerMap.set(player.name.toLowerCase(), player) // Also store original
    })

    // Organize props by player
    const propsByPlayer = new Map<string, any>()

    const bookmakers = gameData.bookmakers || []
    bookmakers.forEach((book: any) => {
      book.markets?.forEach((market: any) => {
        market.outcomes?.forEach((outcome: any) => {
          const playerName = outcome.description || outcome.name
          if (!playerName) return

          // Try to match player
          const normalizedName = playerName
            .toLowerCase()
            .replace(/\./g, '')
            .replace(/ jr$/i, '')
            .replace(/ sr$/i, '')
            .trim()
          
          const playerData = playerMap.get(normalizedName) || playerMap.get(playerName.toLowerCase())

          if (!propsByPlayer.has(playerName)) {
            propsByPlayer.set(playerName, {
              player_name: playerName,
              position: playerData?.position || 'Unknown',
              team: playerData?.team || 'Unknown',
              headshot_url: playerData?.headshot_url || null,
              injury_status: playerData?.injury_status || null,
              props: []
            })
          }

          const playerProps = propsByPlayer.get(playerName)
          playerProps.props.push({
            market: market.key,
            market_display: formatMarketName(market.key),
            point: outcome.point,
            odds: outcome.price,
            book: book.title,
            name: outcome.name // over/under
          })
        })
      })
    })

    // Convert to array and filter by position if specified
    let propsArray = Array.from(propsByPlayer.values())
    
    if (position) {
      propsArray = propsArray.filter(p => 
        p.position.toLowerCase() === position
      )
    }

    // Sort by player name
    propsArray.sort((a, b) => a.player_name.localeCompare(b.player_name))

    return NextResponse.json({
      success: true,
      sport: sport.toUpperCase(),
      position: position || 'all',
      players: propsArray,
      total: propsArray.length
    })

  } catch (error: any) {
    console.error('[ANALYST PICKS] Error fetching player props:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Helper to format market names
function formatMarketName(marketKey: string): string {
  const names: Record<string, string> = {
    player_pass_tds: 'Pass TDs',
    player_pass_yds: 'Pass Yards',
    player_rush_yds: 'Rush Yards',
    player_receptions: 'Receptions',
    player_reception_yds: 'Receiving Yards',
    player_anytime_td: 'Anytime TD',
    player_points: 'Points',
    player_rebounds: 'Rebounds',
    player_assists: 'Assists',
    player_threes: '3-Pointers Made',
    player_points_rebounds_assists: 'Points + Rebounds + Assists'
  }
  return names[marketKey] || marketKey
}

