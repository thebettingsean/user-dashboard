import { NextResponse } from 'next/server'
import { testClickHouseConnection, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Test ClickHouse connection
 * GET /api/clickhouse/test
 */
export async function GET() {
  try {
    console.log('\n🔌 Testing ClickHouse connection...')
    
    // Test basic connection
    const isConnected = await testClickHouseConnection()
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to ClickHouse'
      }, { status: 500 })
    }

    // Test a simple query
    const result = await clickhouseQuery<{current_time: string}>('SELECT now() as current_time')
    
    // Get database info
    const dbInfo = await clickhouseQuery('SHOW DATABASES')
    
    return NextResponse.json({
      success: true,
      message: '✅ ClickHouse connection successful!',
      serverTime: result.data[0]?.current_time,
      databases: dbInfo.data,
      statistics: result.statistics
    })
  } catch (error: any) {
    console.error('[ClickHouse Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

