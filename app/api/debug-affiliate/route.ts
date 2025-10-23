import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email') || 'systems@insideredgeanalytics.com'

    // 1. Get affiliate data
    const affiliateResponse = await fetch(`${PUSHLAP_API_URL}/affiliates?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const affiliateData = affiliateResponse.ok ? await affiliateResponse.json() : null
    const affiliate = Array.isArray(affiliateData) ? affiliateData[0] : affiliateData

    // 2. Try to get links with affiliateId
    let linksWithId = null
    let linksWithIdError = null
    
    if (affiliate?.id) {
      try {
        const linksResponse = await fetch(`${PUSHLAP_API_URL}/affiliate-links?affiliateId=${affiliate.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (linksResponse.ok) {
          linksWithId = await linksResponse.json()
        } else {
          linksWithIdError = {
            status: linksResponse.status,
            statusText: linksResponse.statusText,
            body: await linksResponse.text()
          }
        }
      } catch (e: any) {
        linksWithIdError = e.message
      }
    }

    // 3. Try to get ALL links
    let allLinks = null
    let allLinksError = null
    
    try {
      const allLinksResponse = await fetch(`${PUSHLAP_API_URL}/affiliate-links`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (allLinksResponse.ok) {
        allLinks = await allLinksResponse.json()
      } else {
        allLinksError = {
          status: allLinksResponse.status,
          statusText: allLinksResponse.statusText,
          body: await allLinksResponse.text()
        }
      }
    } catch (e: any) {
      allLinksError = e.message
    }

    return NextResponse.json({
      email,
      affiliate: {
        id: affiliate?.id,
        link: affiliate?.link,
        status: affiliate?.status,
        fullData: affiliate
      },
      linksWithAffiliateId: {
        success: !!linksWithId,
        data: linksWithId,
        error: linksWithIdError
      },
      allLinks: {
        success: !!allLinks,
        data: allLinks,
        error: allLinksError
      }
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

