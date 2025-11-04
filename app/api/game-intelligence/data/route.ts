import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchGames, 
  fetchPublicMoney, 
  fetchRefereeStats,
  fetchPlayerProps,
  type League,
  type Game,
  type PublicMoneyData,
  type PropCategory
} from '@/lib/api/sportsData'

const API_BASE_URL = 'https://api.trendlinelabs.ai'
const API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

interface TeamStats {
  homeTeam: {
    name: string
    asHome: {
      moneyline: { wins: number, losses: number, profit: number, roi: number }
      spread: { wins: number, losses: number, profit: number, roi: number }
      overUnder: { over: number, under: number }
    }
  }
  awayTeam: {
    name: string
    asAway: {
      moneyline: { wins: number, losses: number, profit: number, roi: number }
      spread: { wins: number, losses: number, profit: number, roi: number }
      overUnder: { over: number, under: number }
    }
  }
  seasonAvg: any
}

async function fetchTeamStats(league: League, gameId: string): Promise<TeamStats | null> {
  try {
    const url = `${API_BASE_URL}/api/${league}/games/${gameId}`
    console.log(`  → Fetching team stats: ${url}`)
    
    const response = await fetch(url, {
      headers: { 'insider-api-key': API_KEY },
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status} for team stats`)
      return null
    }

    const data = await response.json()
    
    if (!data.h2h || !data.h2h.competitors) {
      return null
    }

    const { home, away } = data.h2h.competitors

    return {
      homeTeam: {
        name: data.home_team,
        asHome: {
          moneyline: home.stats_as_home?.moneyline || { wins: 0, losses: 0, profit: 0, roi: 0 },
          spread: home.stats_as_home?.spread || { wins: 0, losses: 0, profit: 0, roi: 0 },
          overUnder: {
            over: home.stats_as_home?.over_under?.over?.total || 0,
            under: home.stats_as_home?.over_under?.under?.total || 0
          }
        }
      },
      awayTeam: {
        name: data.away_team,
        asAway: {
          moneyline: away.stats_as_away?.moneyline || { wins: 0, losses: 0, profit: 0, roi: 0 },
          spread: away.stats_as_away?.spread || { wins: 0, losses: 0, profit: 0, roi: 0 },
          overUnder: {
            over: away.stats_as_away?.over_under?.over?.total || 0,
            under: away.stats_as_away?.over_under?.under?.total || 0
          }
        }
      },
      seasonAvg: data.season_avg || null
    }
  } catch (error) {
    console.log('  ✗ Error fetching team stats:', error)
    return null
  }
}

export interface GameIntelligenceData {
  game: Game | null
  publicMoney: PublicMoneyData | null
  refereeStats: any | null
  teamStats: TeamStats | null
  teamRankings: {
    home: any | null
    away: any | null
  }
  playerProps: PropCategory[]
  propParlayRecs: any[]
  anytimeTDRecs: any[]
  fantasyProjections: any[]
  dataStrength: 1 | 2 | 3 // Minimal, Above Avg, Strong
  availableDataSources: string[]
}

/**
 * Aggregates ALL available data for a specific game
 * GET /api/game-intelligence/data?gameId=xxx&league=nfl
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')
    const league = searchParams.get('league')?.toLowerCase() as League

    if (!gameId || !league) {
      return NextResponse.json(
        { error: 'gameId and league are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== AGGREGATING DATA FOR GAME ${gameId} (${league.toUpperCase()}) ===`)

    const availableDataSources: string[] = []
    let dataSourceCount = 0

    // 1. Fetch base game data
    // Use a 7-day range (API limit) - look 1 day back and 6 days forward
    // This catches yesterday's games (timezone issues) and this week's games
    const oneDayAgo = new Date(Date.now() - 1 * 86400000)
    const sixDaysFromNow = new Date(Date.now() + 6 * 86400000)
    const fromDate = oneDayAgo.toISOString().split('T')[0]
    const toDate = sixDaysFromNow.toISOString().split('T')[0]
    
    console.log(`Fetching games from ${fromDate} to ${toDate}`)
    
    // Fetch games directly here instead of using the helper (for better error visibility)
    const gamesUrl = `${process.env.INSIDER_API_URL || 'https://api.trendlinelabs.ai'}/api/${league}/games?from=${fromDate}&to=${toDate}`
    console.log(`🎮 Direct API call: ${gamesUrl}`)
    
    const gamesResponse = await fetch(gamesUrl, {
      headers: {
        'insider-api-key': process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
      },
      cache: 'no-store'
    })
    
    console.log(`📡 Games API status: ${gamesResponse.status}`)
    
    if (!gamesResponse.ok) {
      const errorBody = await gamesResponse.text()
      console.error(`❌ Games API error body: ${errorBody}`)
      return NextResponse.json(
        { 
          error: `Failed to fetch games: ${gamesResponse.status}`,
          details: errorBody,
          url: gamesUrl
        },
        { status: 500 }
      )
    }
    
    const gamesData = await gamesResponse.json()
    const games: Game[] = gamesData.games || []
    console.log(`Found ${games.length} games for ${league.toUpperCase()}`)
    
    const game = games.find((g: Game) => g.game_id === gameId) || null

    if (!game) {
      console.log(`❌ Game not found. Looking for gameId: ${gameId}`)
      console.log(`Available games:`, games.map((g: Game) => ({ id: g.game_id, matchup: `${g.away_team} @ ${g.home_team}` })))
      return NextResponse.json(
        { 
          error: 'Game not found',
          gameId,
          availableGames: games.map((g: Game) => g.game_id)
        },
        { status: 404 }
      )
    }

    console.log(`✅ Game found: ${game.away_team} @ ${game.home_team}`)
    availableDataSources.push('game_details')
    dataSourceCount++

    // 2. Fetch public money data
    console.log('Fetching public money data...')
    const publicMoney = await fetchPublicMoney(league, gameId)
    if (publicMoney) {
      console.log('✅ Public money data available')
      availableDataSources.push('public_money')
      dataSourceCount++
    } else {
      console.log('⚠️ No public money data')
    }

    // 3. Fetch referee stats (if referee assigned)
    let refereeStats: any | null = null
    if (game.referee_id) {
      console.log(`Fetching referee stats for ${game.referee_name}...`)
      refereeStats = await fetchRefereeStats(league, gameId) // Use game ID, not referee ID!
      if (refereeStats) {
        console.log('✅ Referee stats available')
        availableDataSources.push('referee_stats')
        dataSourceCount++
      } else {
        console.log('⚠️ No referee stats')
      }
    } else {
      console.log('⚠️ No referee assigned')
    }

    // 4. Fetch team stats (historical performance data)
    console.log('Fetching team stats...')
    const teamStats = await fetchTeamStats(league, gameId)
    if (teamStats) {
      console.log('✅ Team stats available')
      availableDataSources.push('team_stats')
      dataSourceCount++
    } else {
      console.log('⚠️ No team stats')
    }

    // 5. Fetch player props (top 10-15 props for the game)
    console.log('Fetching player props...')
    const playerProps = await fetchPlayerProps(league, gameId)
    if (playerProps && playerProps.length > 0) {
      console.log(`✅ Player props available (${playerProps.length} categories)`)
      availableDataSources.push('player_props')
      dataSourceCount++
    } else {
      console.log('⚠️ No player props')
    }

    // 6. Fetch prop parlay recommendations (PROPRIETARY TOOL)
    console.log('Fetching prop parlay recommendations...')
    let propParlayRecs: any[] = []
    try {
      const propParlayRes = await fetch(
        `${request.nextUrl.origin}/api/prop-parlay/game-recommendations?awayTeam=${encodeURIComponent(game.away_team)}&homeTeam=${encodeURIComponent(game.home_team)}&sport=${league}`,
        { cache: 'no-store' }
      )
      if (propParlayRes.ok) {
        const propParlayData = await propParlayRes.json()
        propParlayRecs = propParlayData.recommendations || []
        if (propParlayRecs.length > 0) {
          console.log(`✅ Prop parlay tool: ${propParlayRecs.length} recommendations`)
          availableDataSources.push('prop_parlay_tool')
          dataSourceCount += 2 // Worth 2 data sources (proprietary)
        } else {
          console.log('⚠️ No prop parlay recommendations')
        }
      }
    } catch (error) {
      console.log('⚠️ Prop parlay tool error:', error)
    }

    // 7. Fetch anytime TD recommendations (PROPRIETARY TOOL)
    console.log('Fetching anytime TD recommendations...')
    let anytimeTDRecs: any[] = []
    try {
      const tdRes = await fetch(
        `${request.nextUrl.origin}/api/anytime-td/game-recommendations?awayTeam=${encodeURIComponent(game.away_team)}&homeTeam=${encodeURIComponent(game.home_team)}&sport=${league}`,
        { cache: 'no-store' }
      )
      if (tdRes.ok) {
        const tdData = await tdRes.json()
        anytimeTDRecs = tdData.recommendations || []
        if (anytimeTDRecs.length > 0) {
          console.log(`✅ Anytime TD tool: ${anytimeTDRecs.length} recommendations`)
          availableDataSources.push('anytime_td_tool')
          dataSourceCount += 2 // Worth 2 data sources (proprietary)
        } else {
          console.log('⚠️ No anytime TD recommendations')
        }
      }
    } catch (error) {
      console.log('⚠️ Anytime TD tool error:', error)
    }

    // 8. Fetch fantasy projections (PROPRIETARY TOOL)
    console.log('Fetching fantasy projections...')
    let fantasyProjections: any[] = []
    try {
      const fantasyRes = await fetch(
        `${request.nextUrl.origin}/api/fantasy/game-projections?awayTeam=${encodeURIComponent(game.away_team)}&homeTeam=${encodeURIComponent(game.home_team)}&sport=${league}`,
        { cache: 'no-store' }
      )
      if (fantasyRes.ok) {
        const fantasyData = await fantasyRes.json()
        fantasyProjections = fantasyData.projections || []
        if (fantasyProjections.length > 0) {
          console.log(`✅ Fantasy tool: ${fantasyProjections.length} projections`)
          availableDataSources.push('fantasy_tool')
          dataSourceCount++ // Worth 1 data source (supporting context)
        } else {
          console.log('⚠️ No fantasy projections')
        }
      }
    } catch (error) {
      console.log('⚠️ Fantasy tool error:', error)
    }

    // 9. Fetch TeamRankings data (DETAILED TEAM STATS + ATS RESULTS)
    console.log('Fetching TeamRankings data...')
    let homeTeamRankings: any | null = null
    let awayTeamRankings: any | null = null
    try {
      // Fetch home team rankings WITH ATS results
      const homeRankingsRes = await fetch(
        `${request.nextUrl.origin}/api/team-rankings/scrape?team=${encodeURIComponent(game.home_team)}&sport=${league}&includeATS=true`,
        { cache: 'no-store' }
      )
      if (homeRankingsRes.ok) {
        homeTeamRankings = await homeRankingsRes.json()
        console.log(`✅ Home team rankings: ${game.home_team}${homeTeamRankings.atsResults ? ` (${homeTeamRankings.atsResults.length} ATS results)` : ''}`)
      }

      // Fetch away team rankings WITH ATS results
      const awayRankingsRes = await fetch(
        `${request.nextUrl.origin}/api/team-rankings/scrape?team=${encodeURIComponent(game.away_team)}&sport=${league}&includeATS=true`,
        { cache: 'no-store' }
      )
      if (awayRankingsRes.ok) {
        awayTeamRankings = await awayRankingsRes.json()
        console.log(`✅ Away team rankings: ${game.away_team}${awayTeamRankings.atsResults ? ` (${awayTeamRankings.atsResults.length} ATS results)` : ''}`)
      }

      if (homeTeamRankings && awayTeamRankings) {
        availableDataSources.push('team_rankings')
        dataSourceCount += 2 // Worth 2 data sources (rich contextual data)
        
        // Extra credit for ATS results
        if (homeTeamRankings.atsResults || awayTeamRankings.atsResults) {
          availableDataSources.push('ats_results')
          dataSourceCount++ // ATS results add situational context
        }
      } else {
        console.log('⚠️ Incomplete team rankings data')
      }
    } catch (error) {
      console.log('⚠️ TeamRankings error:', error)
    }

    // Calculate data strength based on user's requirements:
    // Count actual data types (not weighted):
    // - Team Rankings (always available)
    // - Public Money
    // - Referee Stats
    // - Team Stats
    // - Player Props
    // - Prop Parlay Tool
    // - Anytime TD Tool
    // - Fantasy Tool
    
    const hasTeamRankings = homeTeamRankings && awayTeamRankings
    const otherDataCount = (publicMoney ? 1 : 0) + 
                          (refereeStats ? 1 : 0) + 
                          (teamStats ? 1 : 0) + 
                          (playerProps && playerProps.length > 0 ? 1 : 0) + 
                          (propParlayRecs.length > 0 ? 1 : 0) + 
                          (anytimeTDRecs.length > 0 ? 1 : 0) + 
                          (fantasyProjections.length > 0 ? 1 : 0)
    
    // Check for analyst picks tied to this game
    let hasAnalystPicks = false
    try {
      const picksRes = await fetch(`${request.nextUrl.origin}/api/analyst-library?gameId=${gameId}`)
      if (picksRes.ok) {
        const picksData = await picksRes.json()
        hasAnalystPicks = picksData.picks && picksData.picks.length > 0
        if (hasAnalystPicks) {
          console.log(`✅ Found ${picksData.picks.length} analyst picks for this game`)
          availableDataSources.push('analyst_picks')
        }
      }
    } catch (error) {
      console.log('⚠️ Could not check for analyst picks:', error)
    }
    
    let dataStrength: 1 | 2 | 3
    
    if (hasTeamRankings && otherDataCount >= 3 && hasAnalystPicks) {
      // Team rankings + 3+ other things + analyst picks = Strong
      dataStrength = 3
    } else if (hasTeamRankings && otherDataCount >= 3) {
      // Team rankings + 3+ other things = Good
      dataStrength = 2
    } else if (hasTeamRankings && otherDataCount <= 2 && hasAnalystPicks) {
      // Team rankings + 0-2 other things + analyst picks = Good
      dataStrength = 2
    } else if (hasTeamRankings && otherDataCount <= 2) {
      // Team rankings + 0-2 other things = Minimal
      dataStrength = 1
    } else {
      // No team rankings (shouldn't happen) = Minimal
      dataStrength = 1
    }

    console.log(`Data Strength: ${dataStrength} (Team Rankings: ${hasTeamRankings ? 'YES' : 'NO'}, Other Data: ${otherDataCount}, Analyst Picks: ${hasAnalystPicks ? 'YES' : 'NO'})`)
    console.log(`Available sources: ${availableDataSources.join(', ')}`)
    console.log('=== DATA AGGREGATION COMPLETE ===\n')

    const response: GameIntelligenceData = {
      game,
      publicMoney,
      refereeStats,
      teamStats,
      teamRankings: {
        home: homeTeamRankings,
        away: awayTeamRankings
      },
      playerProps: playerProps || [],
      propParlayRecs,
      anytimeTDRecs,
      fantasyProjections,
      dataStrength,
      availableDataSources
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error aggregating game intelligence data:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate game data' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

