import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { affiliateId } = await request.json()

    if (!affiliateId) {
      return NextResponse.json(
        { error: 'Affiliate ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching links for affiliate ID:', affiliateId)

    // Get affiliate links from Pushlap
    const response = await fetch(`${PUSHLAP_API_URL}/affiliate-links`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch affiliate links. Status:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch affiliate links' },
        { status: response.status }
      )
    }

    const allLinks = await response.json()
    console.log('All affiliate links response:', JSON.stringify(allLinks, null, 2))

    // Filter links for this affiliate
    const affiliateLinks = Array.isArray(allLinks) 
      ? allLinks.filter((link: any) => link.affiliateId === affiliateId)
      : []

    console.log('Links for this affiliate:', affiliateLinks)

    if (affiliateLinks.length > 0) {
      const primaryLink = affiliateLinks[0]
      const fullUrl = primaryLink.url || primaryLink.link || `https://thebettinginsider.com?ref=${primaryLink.slug || primaryLink.code}`
      
      return NextResponse.json({
        success: true,
        link: fullUrl,
        slug: primaryLink.slug || primaryLink.code,
        allLinks: affiliateLinks
      })
    }

    return NextResponse.json({
      success: false,
      link: null,
      message: 'No links found for this affiliate'
    })

  } catch (error) {
    console.error('Error fetching affiliate links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch affiliate links' },
      { status: 500 }
    )
  }
}

