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

// NFL Prop markets (standard + alternates)
const NFL_PROP_MARKETS = [
  // Standard markets
  'player_pass_tds',
  'player_pass_yds',
  'player_rush_yds',
  'player_receptions',
  'player_reception_yds',
  'player_anytime_td',
  'player_pass_attempts',
  'player_pass_completions',
  'player_pass_interceptions',
  'player_rush_attempts',
  'player_reception_tds',
  'player_rush_tds',
  'player_field_goals',
  'player_kicking_points',
  // Alternate markets
  'player_pass_tds_alternate',
  'player_pass_yds_alternate',
  'player_rush_yds_alternate',
  'player_receptions_alternate',
  'player_reception_yds_alternate',
  'player_pass_attempts_alternate',
  'player_pass_completions_alternate',
  'player_pass_interceptions_alternate',
  'player_pass_longest_completion_alternate',
  'player_pass_rush_yds_alternate',
  'player_pass_rush_reception_tds_alternate',
  'player_pass_rush_reception_yds_alternate',
  'player_reception_longest_alternate',
  'player_reception_tds_alternate',
  'player_rush_attempts_alternate',
  'player_rush_longest_alternate',
  'player_rush_reception_tds_alternate',
  'player_rush_reception_yds_alternate',
  'player_rush_tds_alternate',
  'player_field_goals_alternate',
  'player_kicking_points_alternate',
  'player_pats_alternate',
  'player_sacks_alternate',
  'player_solo_tackles_alternate',
  'player_tackles_assists_alternate',
  'player_assists_alternate'
]

// NBA Prop markets (standard + alternates)
const NBA_PROP_MARKETS = [
  // Standard markets
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_blocks',
  'player_steals',
  'player_turnovers',
  'player_points_rebounds_assists',
  'player_points_assists',
  'player_points_rebounds',
  'player_rebounds_assists',
  // Alternate markets
  'player_points_alternate',
  'player_rebounds_alternate',
  'player_assists_alternate',
  'player_blocks_alternate',
  'player_steals_alternate',
  'player_turnovers_alternate',
  'player_threes_alternate',
  'player_points_assists_alternate',
  'player_points_rebounds_alternate',
  'player_rebounds_assists_alternate',
  'player_points_rebounds_assists_alternate'
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
    const propMarkets = sport === 'nfl' ? NFL_PROP_MARKETS : NBA_PROP_MARKETS
    const marketsParam = propMarkets.join(',')
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${oddsApiId}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=${marketsParam}&oddsFormat=american`
    
    console.log(`[PROPS API] Fetching props for ${sport} game ${oddsApiId}`)
    console.log(`[PROPS API] URL: ${oddsUrl.replace(ODDS_API_KEY, 'XXX')}`)
    
    const oddsResponse = await fetch(oddsUrl)
    if (!oddsResponse.ok) {
      console.error(`[PROPS API] Odds API returned ${oddsResponse.status}`)
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const gameData = await oddsResponse.json()
    console.log(`[PROPS API] Bookmakers found: ${gameData.bookmakers?.length || 0}`)

    // Fetch player data from ClickHouse (images, positions, teams)
    const playersQuery = await clickhouseQuery<{
      name: string
      position: string
      team_abbr: string
      headshot_url: string
      injury_status: string
    }>(`
      SELECT 
        p.name,
        p.position,
        t.abbreviation as team_abbr,
        p.headshot_url,
        p.injury_status
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id AND t.sport = '${sport.toUpperCase()}'
      WHERE p.sport = '${sport.toUpperCase()}'
        AND p.is_active = true
        ${position ? `AND LOWER(p.position) = '${position}'` : ''}
      ORDER BY p.name
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

    console.log(`[PROPS API] Players in ClickHouse: ${playerMap.size}`)

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
              team: playerData?.team_abbr || 'Unknown',
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
    
    console.log(`[PROPS API] Props organized for ${propsArray.length} players`)
    
    if (position) {
      propsArray = propsArray.filter(p => 
        p.position.toLowerCase() === position
      )
      console.log(`[PROPS API] After position filter: ${propsArray.length} players`)
    }

    // Sort by player name
    propsArray.sort((a, b) => a.player_name.localeCompare(b.player_name))

    console.log(`[PROPS API] Returning ${propsArray.length} players with props`)

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
    // NFL Standard
    player_pass_tds: 'Pass TDs',
    player_pass_yds: 'Pass Yards',
    player_rush_yds: 'Rush Yards',
    player_receptions: 'Receptions',
    player_reception_yds: 'Receiving Yards',
    player_anytime_td: 'Anytime TD',
    player_pass_attempts: 'Pass Attempts',
    player_pass_completions: 'Pass Completions',
    player_pass_interceptions: 'Interceptions',
    player_rush_attempts: 'Rush Attempts',
    player_reception_tds: 'Receiving TDs',
    player_rush_tds: 'Rush TDs',
    player_field_goals: 'Field Goals',
    player_kicking_points: 'Kicking Points',
    // NFL Alternates
    player_pass_tds_alternate: 'Pass TDs (Alt)',
    player_pass_yds_alternate: 'Pass Yards (Alt)',
    player_rush_yds_alternate: 'Rush Yards (Alt)',
    player_receptions_alternate: 'Receptions (Alt)',
    player_reception_yds_alternate: 'Receiving Yards (Alt)',
    player_pass_attempts_alternate: 'Pass Attempts (Alt)',
    player_pass_completions_alternate: 'Pass Completions (Alt)',
    player_pass_interceptions_alternate: 'Interceptions (Alt)',
    player_pass_longest_completion_alternate: 'Longest Pass (Alt)',
    player_pass_rush_yds_alternate: 'Pass + Rush Yards (Alt)',
    player_pass_rush_reception_tds_alternate: 'Pass + Rush + Rec TDs (Alt)',
    player_pass_rush_reception_yds_alternate: 'Pass + Rush + Rec Yards (Alt)',
    player_reception_longest_alternate: 'Longest Reception (Alt)',
    player_reception_tds_alternate: 'Receiving TDs (Alt)',
    player_rush_attempts_alternate: 'Rush Attempts (Alt)',
    player_rush_longest_alternate: 'Longest Rush (Alt)',
    player_rush_reception_tds_alternate: 'Rush + Rec TDs (Alt)',
    player_rush_reception_yds_alternate: 'Rush + Rec Yards (Alt)',
    player_rush_tds_alternate: 'Rush TDs (Alt)',
    player_field_goals_alternate: 'Field Goals (Alt)',
    player_kicking_points_alternate: 'Kicking Points (Alt)',
    player_pats_alternate: 'PATs (Alt)',
    player_sacks_alternate: 'Sacks (Alt)',
    player_solo_tackles_alternate: 'Solo Tackles (Alt)',
    player_tackles_assists_alternate: 'Tackles + Assists (Alt)',
    player_assists_alternate: 'Assists (Alt)',
    // NBA Standard
    player_points: 'Points',
    player_rebounds: 'Rebounds',
    player_assists: 'Assists',
    player_threes: '3-Pointers',
    player_blocks: 'Blocks',
    player_steals: 'Steals',
    player_turnovers: 'Turnovers',
    player_points_rebounds_assists: 'Pts + Rebs + Asts',
    player_points_assists: 'Points + Assists',
    player_points_rebounds: 'Points + Rebounds',
    player_rebounds_assists: 'Rebounds + Assists',
    // NBA Alternates
    player_points_alternate: 'Points (Alt)',
    player_rebounds_alternate: 'Rebounds (Alt)',
    player_assists_alternate: 'Assists (Alt)',
    player_blocks_alternate: 'Blocks (Alt)',
    player_steals_alternate: 'Steals (Alt)',
    player_turnovers_alternate: 'Turnovers (Alt)',
    player_threes_alternate: '3-Pointers (Alt)',
    player_points_assists_alternate: 'Pts + Asts (Alt)',
    player_points_rebounds_alternate: 'Pts + Rebs (Alt)',
    player_rebounds_assists_alternate: 'Rebs + Asts (Alt)',
    player_points_rebounds_assists_alternate: 'Pts + Rebs + Asts (Alt)'
  }
  return names[marketKey] || marketKey
}

