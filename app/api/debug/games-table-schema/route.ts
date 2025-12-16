import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check if games table exists and get schema
    const schemaQuery = `DESCRIBE TABLE games`
    const schemaResult = await clickhouseQuery(schemaQuery)
    
    // Check count
    const countQuery = `SELECT count() as total FROM games`
    const countResult = await clickhouseQuery<{ total: number }>(countQuery)
    
    // Get sample
    const sampleQuery = `SELECT * FROM games LIMIT 3`
    const sampleResult = await clickhouseQuery(sampleQuery)
    
    return NextResponse.json({
      exists: true,
      schema: schemaResult.data,
      totalGames: countResult.data?.[0]?.total || 0,
      sampleGames: sampleResult.data || []
    })
  } catch (error: any) {
    return NextResponse.json({ 
      exists: false,
      error: error.message,
      suggestion: 'Create universal games table for all sports'
    }, { status: 500 })
  }
}

