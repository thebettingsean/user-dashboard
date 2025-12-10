import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Warmup endpoint to keep ClickHouse connection alive
 * This prevents cold starts that cause 30-60 second delays
 * Should be called by a cron job every 5 minutes
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Simple query to warm up the connection
    await clickhouseQuery('SELECT 1 as warmup', 'JSONEachRow', 0) // No retries for warmup
    
    const elapsed = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'ClickHouse warmed up',
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: error.message,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

