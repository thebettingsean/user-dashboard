import { NextRequest, NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Fix a specific game with odds data
 * POST /api/clickhouse/fix-game?game_id=401772947&spread=-3.5&total=55.5
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('game_id')
    const spreadClose = parseFloat(searchParams.get('spread') || '0')
    const totalClose = parseFloat(searchParams.get('total') || '0')
    
    if (!gameId) {
      return NextResponse.json({ error: 'game_id required' }, { status: 400 })
    }
    
    // Get current game data
    const gameData = await clickhouseQuery(`
      SELECT home_score, away_score FROM nfl_games WHERE game_id = ${gameId}
    `)
    
    if (!gameData.data[0]) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    const homeScore = gameData.data[0].home_score
    const awayScore = gameData.data[0].away_score
    const totalPoints = homeScore + awayScore
    const margin = homeScore - awayScore
    
    // Calculate derived fields
    const homeWon = margin > 0 ? 1 : 0
    const homeCovered = spreadClose !== 0 ? (margin + spreadClose > 0 ? 1 : (margin + spreadClose === 0 ? 0 : 0)) : 0
    const spreadPush = spreadClose !== 0 && margin + spreadClose === 0 ? 1 : 0
    const wentOver = totalClose > 0 && totalPoints > totalClose ? 1 : 0
    const wentUnder = totalClose > 0 && totalPoints < totalClose ? 1 : 0
    const totalPush = totalClose > 0 && totalPoints === totalClose ? 1 : 0
    
    // Update the game
    await clickhouseCommand(`
      ALTER TABLE nfl_games UPDATE
        spread_close = ${spreadClose},
        total_close = ${totalClose},
        total_points = ${totalPoints},
        home_won = ${homeWon},
        home_covered = ${homeCovered},
        spread_push = ${spreadPush},
        went_over = ${wentOver},
        went_under = ${wentUnder},
        total_push = ${totalPush}
      WHERE game_id = ${gameId}
    `)
    
    return NextResponse.json({
      success: true,
      game_id: gameId,
      updated: {
        spread_close: spreadClose,
        total_close: totalClose,
        total_points: totalPoints,
        home_won: homeWon,
        home_covered: homeCovered,
        went_over: wentOver,
        went_under: wentUnder
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

