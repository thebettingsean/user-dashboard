import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('game_id') || '401772948' // Falcons @ Bucs Week 15
  
  try {
    // Check if game exists
    const existsResult = await clickhouseQuery<{ count: number }>(`
      SELECT count() as count FROM nfl_games WHERE game_id = ${gameId}
    `)
    
    const exists = (existsResult.data?.[0]?.count || 0) > 0
    
    if (exists) {
      return NextResponse.json({
        success: true,
        message: `Game ${gameId} already exists`,
        action: 'none'
      })
    }
    
    // Falcons @ Bucs - Thursday Dec 12, 2024 (Week 15)
    // Final score: Falcons 29, Bucs 28
    // Bucs were favored at home, spread was around -3
    const insertSql = `
      INSERT INTO nfl_games (
        game_id, season, week, game_date, game_time,
        home_team_id, away_team_id, home_score, away_score,
        spread_close, total_close, home_covered,
        is_division_game, is_conference_game
      ) VALUES (
        ${gameId}, 2025, 15, '2025-12-12', '2025-12-12 01:15:00',
        27, 1, 28, 29,
        -3.0, 47.5, 0,
        1, 1
      )
    `
    
    await clickhouseCommand(insertSql)
    
    // Verify insertion
    const verifyResult = await clickhouseQuery<{ count: number }>(`
      SELECT count() as count FROM nfl_games WHERE game_id = ${gameId}
    `)
    
    const inserted = (verifyResult.data?.[0]?.count || 0) > 0
    
    return NextResponse.json({
      success: true,
      message: inserted ? `Game ${gameId} successfully inserted` : `Insert may have failed`,
      action: 'inserted',
      game: {
        game_id: gameId,
        matchup: 'Atlanta Falcons @ Tampa Bay Buccaneers',
        score: '29-28',
        spread: -3.0,
        total: 47.5,
        home_covered: false // Bucs lost outright
      }
    })
    
  } catch (error: any) {
    console.error('Error adding game:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

