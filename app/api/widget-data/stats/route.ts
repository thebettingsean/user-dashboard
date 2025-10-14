// app/api/widget-data/stats/route.ts
import { NextResponse } from 'next/server'
import { getStatsWidgetData } from '@/lib/api/widgetData'

export async function GET() {
  try {
    const data = await getStatsWidgetData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in stats widget API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats widget data' },
      { status: 500 }
    )
  }
}

// Revalidate every 30 minutes
export const revalidate = 1800
