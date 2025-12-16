import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get sample teams
    const query = `SELECT * FROM teams WHERE sport = 'nfl' LIMIT 3`
    const result = await clickhouseQuery(query)
    
    return NextResponse.json({
      sampleTeams: result.data,
      columns: result.data && result.data.length > 0 ? Object.keys(result.data[0]) : []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

