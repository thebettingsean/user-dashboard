import { NextResponse } from 'next/server'

/**
 * Complete ESPN Game Data Verification
 * Tests ALL endpoints we need for nfl_games table
 */

const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'
const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') || '401671745'
  
  try {
    console.log(`[Complete Game Check] Testing game ${gameId}...`)
    
    const verification: any = {
      game_id: gameId,
      data_available: {}
    }

    // 1. GAME METADATA & SCORES
    try {
      const gameUrl = `${ESPN_CORE}/events/${gameId}`
      const gameRes = await fetch(gameUrl)
      if (gameRes.ok) {
        const game = await gameRes.json()
        verification.data_available.game_metadata = {
          found: true,
          date: game.date,
          name: game.name,
          season: game.season?.year,
          week: game.week?.number,
          competitions_available: !!game.competitions
        }
      }
    } catch (err: any) {
      verification.data_available.game_metadata = { found: false, error: err.message }
    }

    // 2. TEAMS & SCORES (from summary)
    try {
      const summaryUrl = `${ESPN_SITE}/summary?event=${gameId}`
      const summaryRes = await fetch(summaryUrl)
      if (summaryRes.ok) {
        const summary = await summaryRes.json()
        const comp = summary.boxscore?.teams
        verification.data_available.teams_scores = {
          found: true,
          home_team: comp?.[0]?.team?.displayName,
          away_team: comp?.[1]?.team?.displayName,
          home_score: comp?.[0]?.score,
          away_score: comp?.[1]?.score,
          venue: summary.gameInfo?.venue?.fullName,
          location: summary.gameInfo?.venue?.address?.city
        }
      }
    } catch (err: any) {
      verification.data_available.teams_scores = { found: false, error: err.message }
    }

    // 3. ODDS DATA
    try {
      const oddsUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/odds`
      const oddsRes = await fetch(oddsUrl)
      if (oddsRes.ok) {
        const odds = await oddsRes.json()
        const provider = odds.items?.[0]
        
        if (provider?.$ref) {
          // Fetch detailed odds from first provider
          const providerRes = await fetch(provider.$ref)
          if (providerRes.ok) {
            const providerData = await providerRes.json()
            verification.data_available.odds = {
              found: true,
              provider_name: provider.provider?.name,
              spread: providerData.spread || providerData.details?.match(/[-+]?\d+\.?\d*/)?.[0],
              total: providerData.overUnder,
              has_open_close: !!(providerData.awayTeamOdds?.open && providerData.awayTeamOdds?.close),
              sample_data: {
                spread_details: providerData.details,
                over_under: providerData.overUnder,
                home_ml: providerData.homeTeamOdds?.moneyLine,
                away_ml: providerData.awayTeamOdds?.moneyLine,
                opening_spread: providerData.homeTeamOdds?.open?.pointSpread?.american,
                closing_spread: providerData.homeTeamOdds?.close?.pointSpread?.american,
                opening_ml: providerData.homeTeamOdds?.open?.moneyLine?.american,
                closing_ml: providerData.homeTeamOdds?.close?.moneyLine?.american
              }
            }
          }
        }
      }
    } catch (err: any) {
      verification.data_available.odds = { found: false, error: err.message }
    }

    // 4. WIN PROBABILITY
    try {
      const predictorUrl = `${ESPN_CORE}/events/${gameId}/competitions/${gameId}/predictor`
      const predictorRes = await fetch(predictorUrl)
      if (predictorRes.ok) {
        const predictor = await predictorRes.json()
        verification.data_available.predictor = {
          found: true,
          home_win_prob: predictor.homeTeam?.gameProjection,
          away_win_prob: predictor.awayTeam?.gameProjection
        }
      }
    } catch (err: any) {
      verification.data_available.predictor = { found: false, error: err.message }
    }

    // 5. VENUE DETAILS
    try {
      const summaryUrl = `${ESPN_SITE}/summary?event=${gameId}`
      const summaryRes = await fetch(summaryUrl)
      if (summaryRes.ok) {
        const summary = await summaryRes.json()
        verification.data_available.venue = {
          found: true,
          name: summary.gameInfo?.venue?.fullName,
          city: summary.gameInfo?.venue?.address?.city,
          state: summary.gameInfo?.venue?.address?.state,
          indoor: summary.gameInfo?.venue?.indoor,
          capacity: summary.gameInfo?.venue?.capacity
        }
      }
    } catch (err: any) {
      verification.data_available.venue = { found: false, error: err.message }
    }

    // SUMMARY
    const allFound = Object.values(verification.data_available).every((v: any) => v.found)
    
    verification.summary = {
      all_required_data_available: allFound,
      missing: Object.entries(verification.data_available)
        .filter(([_, v]: any) => !v.found)
        .map(([k]) => k)
    }

    return NextResponse.json({
      success: true,
      ...verification
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

