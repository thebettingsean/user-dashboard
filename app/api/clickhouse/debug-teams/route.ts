import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const teams = await clickhouseQuery(`
      SELECT * FROM teams LIMIT 20
    `)
    
    const count = await clickhouseQuery(`
      SELECT COUNT(*) as total FROM teams
    `)
    
    return NextResponse.json({
      total: count.data?.[0]?.total,
      sample: teams.data
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

