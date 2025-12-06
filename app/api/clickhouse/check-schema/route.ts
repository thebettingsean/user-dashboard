import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check nfl_box_scores_v2 schema
    const boxScoresSchema = await clickhouseQuery(`DESCRIBE TABLE nfl_box_scores_v2`)
    
    // Check players table for position
    const playersSchema = await clickhouseQuery(`DESCRIBE TABLE players`)
    
    // Sample data from box scores
    const sampleBoxScore = await clickhouseQuery(`
      SELECT * FROM nfl_box_scores_v2 LIMIT 1
    `)
    
    return NextResponse.json({
      boxScoresColumns: boxScoresSchema.data.map((c: any) => c.name),
      playersColumns: playersSchema.data.map((c: any) => c.name),
      sampleBoxScore: sampleBoxScore.data[0]
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

