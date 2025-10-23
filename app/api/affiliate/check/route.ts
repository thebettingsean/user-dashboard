import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if affiliate exists by email
    const response = await fetch(`${PUSHLAP_API_URL}/affiliates?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      // Affiliate doesn't exist or API error
      return NextResponse.json({ 
        isAffiliate: false,
        data: null 
      })
    }

    const data = await response.json()
    
    // Check if we got an affiliate back
    if (data && (Array.isArray(data) ? data.length > 0 : data.id)) {
      const affiliate = Array.isArray(data) ? data[0] : data
      return NextResponse.json({
        isAffiliate: true,
        data: {
          id: affiliate.id,
          name: affiliate.name || `${affiliate.firstName} ${affiliate.lastName}`,
          email: affiliate.email,
          commissionRate: affiliate.commissionRate,
          link: affiliate.link,
          status: affiliate.status,
          detailsComplete: affiliate.detailsComplete || false,
          payoutEmail: affiliate.payoutEmail || null,
          paymentMethod: affiliate.paymentMethod || null,
          totalCommissionEarned: affiliate.totalCommissionEarned || 0,
          numberOfReferredUsers: affiliate.numberOfReferredUsers || 0,
          numberOfClicks: affiliate.numberOfClicks || 0
        }
      })
    }

    return NextResponse.json({ 
      isAffiliate: false,
      data: null 
    })

  } catch (error) {
    console.error('Error checking affiliate status:', error)
    return NextResponse.json(
      { error: 'Failed to check affiliate status' },
      { status: 500 }
    )
  }
}

