import { NextResponse } from 'next/server'

/**
 * Explore ESPN Odds Endpoints
 * Based on: https://github.com/pseudo-r/Public-ESPN-API
 */

const ESPN_CORE_URL = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') || '401671745' // Default to a 2025 game
  
  try {
    console.log(`[ESPN Odds Explorer] Checking game ${gameId}...`)

    const results: any = {
      game_id: gameId,
      endpoints_tested: []
    }

    // 1. General odds endpoint
    try {
      const oddsUrl = `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/odds`
      console.log('Testing:', oddsUrl)
      const oddsRes = await fetch(oddsUrl)
      
      if (oddsRes.ok) {
        const odds = await oddsRes.json()
        results.endpoints_tested.push({
          name: 'General Odds',
          url: oddsUrl,
          status: 'SUCCESS',
          data: odds,
          providers: odds.items?.length || 0,
          provider_list: odds.items?.map((item: any) => ({
            ref: item.$ref,
            provider_id: item.$ref?.split('/').pop()
          }))
        })
      } else {
        results.endpoints_tested.push({
          name: 'General Odds',
          url: oddsUrl,
          status: `FAILED: ${oddsRes.status}`
        })
      }
    } catch (err: any) {
      results.endpoints_tested.push({
        name: 'General Odds',
        status: `ERROR: ${err.message}`
      })
    }

    // 2. Try a specific provider (consensus is usually provider ID 1000)
    try {
      const providerUrl = `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/odds/1000`
      console.log('Testing specific provider:', providerUrl)
      const providerRes = await fetch(providerUrl)
      
      if (providerRes.ok) {
        const providerOdds = await providerRes.json()
        results.endpoints_tested.push({
          name: 'Provider Odds (ID: 1000)',
          url: providerUrl,
          status: 'SUCCESS',
          data: providerOdds,
          available_fields: Object.keys(providerOdds)
        })
      } else {
        results.endpoints_tested.push({
          name: 'Provider Odds',
          url: providerUrl,
          status: `FAILED: ${providerRes.status}`
        })
      }
    } catch (err: any) {
      results.endpoints_tested.push({
        name: 'Provider Odds',
        status: `ERROR: ${err.message}`
      })
    }

    // 3. Test predictor (win probability)
    try {
      const predictorUrl = `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/predictor`
      console.log('Testing predictor:', predictorUrl)
      const predictorRes = await fetch(predictorUrl)
      
      if (predictorRes.ok) {
        const predictor = await predictorRes.json()
        results.endpoints_tested.push({
          name: 'Predictor (Win Probability)',
          url: predictorUrl,
          status: 'SUCCESS',
          data: predictor
        })
      } else {
        results.endpoints_tested.push({
          name: 'Predictor',
          url: predictorUrl,
          status: `FAILED: ${predictorRes.status}`
        })
      }
    } catch (err: any) {
      results.endpoints_tested.push({
        name: 'Predictor',
        status: `ERROR: ${err.message}`
      })
    }

    // 4. Check for game details (final scores, winner)
    try {
      const gameUrl = `${ESPN_CORE_URL}/events/${gameId}`
      console.log('Testing game details:', gameUrl)
      const gameRes = await fetch(gameUrl)
      
      if (gameRes.ok) {
        const game = await gameRes.json()
        results.endpoints_tested.push({
          name: 'Game Details',
          url: gameUrl,
          status: 'SUCCESS',
          has_competitions: !!game.competitions,
          sample_data: {
            date: game.date,
            name: game.name,
            status: game.status?.type?.name
          }
        })
      }
    } catch (err: any) {
      results.endpoints_tested.push({
        name: 'Game Details',
        status: `ERROR: ${err.message}`
      })
    }

    return NextResponse.json({
      success: true,
      ...results
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        game_id: gameId
      },
      { status: 500 }
    )
  }
}

