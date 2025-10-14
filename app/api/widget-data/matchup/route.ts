// app/api/widget-data/matchup/route.ts
import { NextResponse } from 'next/server'
import { getMatchupWidgetData } from '@/lib/api/widgetData'

export async function GET() {
  try {
    const data = await getMatchupWidgetData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in matchup widget API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matchup widget data' },
      { status: 500 }
    )
  }
}

// Revalidate every 30 minutes
export const revalidate = 1800
