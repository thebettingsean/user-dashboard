import { NextResponse } from 'next/server'

const API_URL = 'https://actual-anytime-touchdown-final-tool-production.up.railway.app/anytime-td-adjusted'

export async function GET() {
  try {
    const res = await fetch(API_URL, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching TD data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch TD data' },
      { status: 500 }
    )
  }
}

