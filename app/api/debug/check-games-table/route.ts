import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check total games
    const totalQuery = await clickhouseQuery(`SELECT count() as total FROM games`)
    
    // Check games with game_time > now()
    const futureQuery = await clickhouseQuery(`
      SELECT count() as total FROM games WHERE game_time > now()
    `)
    
    // Sample games
    const sampleQuery = await clickhouseQuery(`
      SELECT game_id, sport, game_time, updated_at 
      FROM games 
      ORDER BY updated_at DESC 
      LIMIT 10
    `)
    
    return NextResponse.json({
      success: true,
      totalGames: totalQuery.data?.[0]?.total || 0,
      futureGames: futureQuery.data?.[0]?.total || 0,
      sampleGames: sampleQuery.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

