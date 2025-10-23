import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { affiliateId, email } = await request.json()

    if (!affiliateId && !email) {
      return NextResponse.json(
        { error: 'Affiliate ID or email is required' },
        { status: 400 }
      )
    }

    // Since we don't have permission to create links via API,
    // we'll generate a tracking link using the standard format
    // The Pushlap tracking script will handle the rest
    
    // Extract a clean slug from email or use affiliate ID
    let slug = 'affiliate'
    if (email) {
      // Use part of email before @ as slug
      slug = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    }

    // Generate tracking link
    const trackingLink = `https://thebettinginsider.com?ref=${slug}`

    console.log('Generated tracking link:', trackingLink)

    return NextResponse.json({
      success: true,
      link: trackingLink
    })

  } catch (error) {
    console.error('Error creating affiliate link:', error)
    return NextResponse.json(
      { error: 'Failed to create affiliate link' },
      { status: 500 }
    )
  }
}

