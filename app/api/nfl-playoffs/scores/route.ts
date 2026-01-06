import { NextRequest, NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'

// Scoring points per round
const SCORING = {
  wildcard: 10, // per game
  divisional: 20, // per game
  conference: 40, // per game
  superbowl: 80, // per game
}

// Game keys mapped to their rounds
const GAME_ROUNDS: Record<string, 'wildcard' | 'divisional' | 'conference' | 'superbowl'> = {
  afc_wc_1: 'wildcard',
  afc_wc_2: 'wildcard',
  afc_wc_3: 'wildcard',
  nfc_wc_1: 'wildcard',
  nfc_wc_2: 'wildcard',
  nfc_wc_3: 'wildcard',
  afc_div_1: 'divisional',
  afc_div_2: 'divisional',
  nfc_div_1: 'divisional',
  nfc_div_2: 'divisional',
  afc_conf: 'conference',
  nfc_conf: 'conference',
  sb: 'superbowl',
}

// POST /api/nfl-playoffs/scores - Submit game result and recalculate scores
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameKey, winner, password } = body

    // Password check
    if (password !== 'sean') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!gameKey) {
      return NextResponse.json({ error: 'Game key is required' }, { status: 400 })
    }

    // If winner is empty/null, delete the game result
    if (!winner || winner.trim() === '') {
      const { error: deleteError } = await supabaseUsers
        .from('nfl_playoff_game_results')
        .delete()
        .eq('game_key', gameKey)

      if (deleteError) {
        console.error('Error deleting game result:', deleteError)
        return NextResponse.json({ error: 'Failed to delete game result' }, { status: 500 })
      }

      // Recalculate all bracket scores after deletion
      const { data: allBrackets, error: bracketsError } = await supabaseUsers
        .from('nfl_playoff_brackets')
        .select('*')

      if (bracketsError) {
        console.error('Error fetching brackets:', bracketsError)
        return NextResponse.json({ error: 'Failed to fetch brackets' }, { status: 500 })
      }

      // Get all remaining game results
      const { data: gameResults, error: resultsError } = await supabaseUsers
        .from('nfl_playoff_game_results')
        .select('*')

      if (resultsError) {
        console.error('Error fetching game results:', resultsError)
        return NextResponse.json({ error: 'Failed to fetch game results' }, { status: 500 })
      }

      // Create a map of game results
      const resultsMap: Record<string, string> = {}
      gameResults?.forEach(result => {
        resultsMap[result.game_key] = result.winner
      })

      // Calculate scores for each bracket
      const updates = []
      for (const bracket of allBrackets || []) {
        let score = 0
        const selections = bracket.selections as Record<string, { selected?: 'top' | 'bottom', top?: string, bottom?: string }>

        for (const [gameKey, result] of Object.entries(resultsMap)) {
          const game = selections[gameKey]
          if (!game || !game.selected) continue

          const predictedWinner = game.selected === 'top' ? game.top : game.bottom
          if (predictedWinner === result) {
            // Correct prediction
            const round = GAME_ROUNDS[gameKey]
            if (round) {
              score += SCORING[round]
            }
          }
        }

        // Update bracket score
        updates.push(
          supabaseUsers
            .from('nfl_playoff_brackets')
            .update({ score })
            .eq('id', bracket.id)
        )
      }

      // Execute all updates
      await Promise.all(updates)

      return NextResponse.json({ 
        message: 'Game result cleared and scores updated',
        gameResult: null,
      })
    }

    // Upsert game result
    const { data: gameResult, error: resultError } = await supabaseUsers
      .from('nfl_playoff_game_results')
      .upsert({
        game_key: gameKey,
        winner: winner,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'game_key',
      })
      .select()
      .single()

    if (resultError || !gameResult) {
      console.error('Error saving game result:', resultError)
      return NextResponse.json({ error: 'Failed to save game result' }, { status: 500 })
    }

    // Recalculate all bracket scores
    const { data: allBrackets, error: bracketsError } = await supabaseUsers
      .from('nfl_playoff_brackets')
      .select('*')

    if (bracketsError) {
      console.error('Error fetching brackets:', bracketsError)
      return NextResponse.json({ error: 'Failed to fetch brackets' }, { status: 500 })
    }

    // Get all game results
    const { data: gameResults, error: resultsError } = await supabaseUsers
      .from('nfl_playoff_game_results')
      .select('*')

    if (resultsError) {
      console.error('Error fetching game results:', resultsError)
      return NextResponse.json({ error: 'Failed to fetch game results' }, { status: 500 })
    }

    // Create a map of game results
    const resultsMap: Record<string, string> = {}
    gameResults?.forEach(result => {
      resultsMap[result.game_key] = result.winner
    })

    // Calculate scores for each bracket
    const updates = []
    for (const bracket of allBrackets || []) {
      let score = 0
      const selections = bracket.selections as Record<string, { selected?: 'top' | 'bottom', top?: string, bottom?: string }>

      for (const [gameKey, result] of Object.entries(resultsMap)) {
        const game = selections[gameKey]
        if (!game || !game.selected) continue

        const predictedWinner = game.selected === 'top' ? game.top : game.bottom
        if (predictedWinner === result) {
          // Correct prediction
          const round = GAME_ROUNDS[gameKey]
          if (round) {
            score += SCORING[round]
          }
        }
      }

      // Update bracket score
      updates.push(
        supabaseUsers
          .from('nfl_playoff_brackets')
          .update({ score })
          .eq('id', bracket.id)
      )
    }

    // Execute all updates
    await Promise.all(updates)

    return NextResponse.json({ 
      message: 'Game result saved and scores updated',
      gameResult,
    })
  } catch (error) {
    console.error('Error in POST /api/nfl-playoffs/scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/nfl-playoffs/scores - Get all game results
export async function GET(request: NextRequest) {
  try {
    const { data: results, error } = await supabaseUsers
      .from('nfl_playoff_game_results')
      .select('*')
      .order('completed_at', { ascending: true })

    if (error) {
      console.error('Error fetching game results:', error)
      return NextResponse.json({ error: 'Failed to fetch game results' }, { status: 500 })
    }

    return NextResponse.json({ results: results || [] })
  } catch (error) {
    console.error('Error in GET /api/nfl-playoffs/scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

