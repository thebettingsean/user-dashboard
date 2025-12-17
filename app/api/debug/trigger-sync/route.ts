import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Trigger sync-live-odds
    const syncResponse = await fetch('https://www.thebettinginsider.com/api/cron/sync-live-odds', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const syncData = await syncResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Sync triggered',
      syncResult: syncData
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

