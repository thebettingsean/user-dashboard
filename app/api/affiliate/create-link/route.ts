import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { affiliateId, customSlug } = await request.json()

    if (!affiliateId) {
      return NextResponse.json(
        { error: 'Affiliate ID is required' },
        { status: 400 }
      )
    }

    // Create affiliate link via Pushlap API
    const response = await fetch(`${PUSHLAP_API_URL}/affiliate-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        affiliateId: affiliateId,
        slug: customSlug || undefined // Custom slug if provided
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to create affiliate link:', errorData)
      return NextResponse.json(
        { error: 'Failed to create affiliate link', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Created affiliate link:', data)

    return NextResponse.json({
      success: true,
      link: data.url || data.link || null
    })

  } catch (error) {
    console.error('Error creating affiliate link:', error)
    return NextResponse.json(
      { error: 'Failed to create affiliate link' },
      { status: 500 }
    )
  }
}

