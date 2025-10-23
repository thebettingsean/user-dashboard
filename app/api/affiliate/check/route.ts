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
    
    console.log('Pushlap API response:', JSON.stringify(data, null, 2))
    
    // Check if we got an affiliate back
    if (data && (Array.isArray(data) ? data.length > 0 : data.id)) {
      const affiliate = Array.isArray(data) ? data[0] : data
      console.log('Affiliate link from Pushlap:', affiliate.link)
      
      // If link is null, try fetching from affiliate-links endpoint
      let affiliateLink = affiliate.link
      
      if (!affiliateLink && affiliate.id) {
        try {
          const linksResponse = await fetch(`${PUSHLAP_API_URL}/affiliate-links`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (linksResponse.ok) {
            const allLinks = await linksResponse.json()
            console.log('Fetched affiliate links:', allLinks)
            
            // Find links for this affiliate
            const myLinks = Array.isArray(allLinks) 
              ? allLinks.filter((link: any) => link.affiliateId === affiliate.id)
              : []
            
            if (myLinks.length > 0) {
              const primaryLink = myLinks[0]
              affiliateLink = primaryLink.url || primaryLink.link || `https://thebettinginsider.com?ref=${primaryLink.slug || primaryLink.code}`
              console.log('Found affiliate link:', affiliateLink)
            }
          }
        } catch (linkError) {
          console.error('Error fetching affiliate links:', linkError)
        }
      }
      
      return NextResponse.json({
        isAffiliate: true,
        data: {
          id: affiliate.id,
          name: affiliate.name || `${affiliate.firstName} ${affiliate.lastName}`,
          email: affiliate.email,
          commissionRate: affiliate.commissionRate,
          link: affiliateLink,
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

