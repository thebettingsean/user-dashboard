import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || 'nfl_box_scores'
  
  try {
    // Get total count
    const countResult = await clickhouseQuery(`SELECT count() as total FROM ${table}`)
    
    // Get sample
    const sample = await clickhouseQuery(`SELECT * FROM ${table} LIMIT 3`)
    
    // Check for duplicates
    const duplicates = await clickhouseQuery(`
      SELECT player_id, game_id, count() as cnt
      FROM ${table}
      GROUP BY player_id, game_id
      HAVING cnt > 1
      ORDER BY cnt DESC
      LIMIT 10
    `)

    return NextResponse.json({
      success: true,
      table,
      total_records: countResult.data?.[0]?.total || 0,
      sample_records: sample.data || [],
      duplicates: duplicates.data || []
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

