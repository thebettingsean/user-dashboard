import { NextResponse } from 'next/server'

/**
 * Trigger sync-live-odds and capture detailed logs
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Call the actual sync-live-odds cron
    const response = await fetch('http://localhost:3000/api/cron/sync-live-odds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const data = await response.json()
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      duration_ms: duration,
      response_data: data,
      note: "Check response_data for detailed logs from sync-live-odds"
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

