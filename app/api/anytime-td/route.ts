import { NextResponse } from 'next/server'

const API_URL = 'https://actual-anytime-touchdown-final-tool-production.up.railway.app/anytime-td-adjusted'

export async function GET() {
  try {
    console.log('Fetching TD data from:', API_URL)
    
    const res = await fetch(API_URL, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    console.log('Response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error('API error response:', errorText)
      throw new Error(`API responded with status ${res.status}`)
    }

    const data = await res.json()
    console.log('Successfully fetched TD data, players count:', data.players?.length || 0)
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error('Error fetching TD data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch TD data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

