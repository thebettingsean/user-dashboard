import { NextResponse } from 'next/server'

/**
 * Explore ESPN Odds API Structure
 * Based on: https://github.com/pseudo-r/Public-ESPN-API
 */

const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') || '401671706' // Recent 2024 game
  
  try {
    const results: any = {
      game_id: gameId,
      endpoints_tested: []
    }

    // Test 1: All odds providers
    console.log('[Odds Test] Testing all providers endpoint...')
    const allOddsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/odds`
    
    try {
      const res1 = await fetch(allOddsUrl)
      const data1 = await res1.json()
      
      results.endpoints_tested.push({
        endpoint: 'All Odds Providers',
        url: allOddsUrl,
        status: res1.status,
        has_data: !!data1.items,
        item_count: data1.items?.length || 0,
        sample_provider: data1.items?.[0] ? {
          provider: data1.items[0].provider?.name || 'Unknown',
          has_spread: !!data1.items[0].spread,
          has_overUnder: !!data1.items[0].overUnder,
          has_details: !!data1.items[0].details
        } : null,
        full_first_item: data1.items?.[0] || null
      })
    } catch (err: any) {
      results.endpoints_tested.push({
        endpoint: 'All Odds Providers',
        url: allOddsUrl,
        error: err.message
      })
    }

    // Test 2: Predictor endpoint
    console.log('[Odds Test] Testing predictor endpoint...')
    const predictorUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/predictor`
    
    try {
      const res2 = await fetch(predictorUrl)
      const data2 = await res2.json()
      
      results.endpoints_tested.push({
        endpoint: 'Predictor',
        url: predictorUrl,
        status: res2.status,
        has_home_win_prob: !!data2.homeTeam?.gameProjection,
        home_win_prob: data2.homeTeam?.gameProjection || null,
        away_win_prob: data2.awayTeam?.gameProjection || null
      })
    } catch (err: any) {
      results.endpoints_tested.push({
        endpoint: 'Predictor',
        url: predictorUrl,
        error: err.message
      })
    }

    // Test 3: Try fetching from scoreboard to see structure
    console.log('[Odds Test] Testing scoreboard endpoint...')
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
    
    try {
      const res3 = await fetch(scoreboardUrl + '?limit=1')
      const data3 = await res3.json()
      
      const firstGame = data3.events?.[0]
      const competition = firstGame?.competitions?.[0]
      
      results.endpoints_tested.push({
        endpoint: 'Scoreboard (Sample)',
        url: scoreboardUrl,
        status: res3.status,
        has_odds_in_competition: !!competition?.odds,
        odds_structure: competition?.odds || null,
        sample_game_id: firstGame?.id
      })
    } catch (err: any) {
      results.endpoints_tested.push({
        endpoint: 'Scoreboard',
        url: scoreboardUrl,
        error: err.message
      })
    }

    return NextResponse.json({
      success: true,
      ...results,
      tip: 'Check the full_first_item for complete odds structure from ESPN Core API'
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

