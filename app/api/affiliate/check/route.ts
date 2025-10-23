import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

// Use Funnel Analytics Supabase for affiliate data
const supabaseUrl = process.env.SUPABASE_FUNNEL_URL!
const supabaseKey = process.env.SUPABASE_FUNNEL_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // FIRST: Check Supabase for cached affiliate data (from webhooks)
    const { data: cachedAffiliate, error: cacheError } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('email', email)
      .single()

    if (cachedAffiliate && !cacheError && cachedAffiliate.link) {
      // Only use cache if link exists!
      console.log('Found affiliate in cache with link:', cachedAffiliate.link)
      return NextResponse.json({
        isAffiliate: true,
        data: {
          id: cachedAffiliate.affiliate_id,
          name: cachedAffiliate.first_name && cachedAffiliate.last_name 
            ? `${cachedAffiliate.first_name} ${cachedAffiliate.last_name}`
            : 'Affiliate',
          email: cachedAffiliate.email,
          commissionRate: cachedAffiliate.commission_rate || 50,
          link: cachedAffiliate.link,
          status: cachedAffiliate.status,
          detailsComplete: cachedAffiliate.details_complete || false,
          payoutEmail: cachedAffiliate.payout_email,
          paymentMethod: cachedAffiliate.payment_method,
          totalCommissionEarned: cachedAffiliate.total_commission_earned || 0,
          numberOfReferredUsers: cachedAffiliate.number_of_referred_users || 0,
          numberOfClicks: cachedAffiliate.number_of_clicks || 0
        }
      })
    }
    
    // If in cache but no link, fall through to API to fetch fresh data
    if (cachedAffiliate && !cacheError && !cachedAffiliate.link) {
      console.log('Affiliate in cache but no link - fetching from API...')
    }

    // FALLBACK: Check Pushlap API if not in cache

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
      console.log('Affiliate links array:', affiliate.affiliateLinks)
      
      // Check if affiliateLinks array exists and has links
      let affiliateLink = affiliate.link
      
      if (!affiliateLink && affiliate.affiliateLinks && affiliate.affiliateLinks.length > 0) {
        // Use the LAST link (most recent)
        const latestLink = affiliate.affiliateLinks[affiliate.affiliateLinks.length - 1]
        const slug = latestLink.link || latestLink.slug || latestLink.code
        
        if (slug) {
          affiliateLink = `https://thebettinginsider.com?ref=${slug}`
          console.log('Built link from affiliateLinks array:', affiliateLink)
        }
      }
      
      if (!affiliateLink && affiliate.id) {
        try {
          // Try with affiliateId query parameter
          const linksResponse = await fetch(`${PUSHLAP_API_URL}/affiliate-links?affiliateId=${affiliate.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          
          console.log('Links API response status:', linksResponse.status)
          const linksText = await linksResponse.text()
          console.log('Links API raw response:', linksText)
          
          if (linksResponse.ok && linksText) {
            try {
              const linksData = JSON.parse(linksText)
              console.log('Parsed links data:', JSON.stringify(linksData, null, 2))
              
              // Handle both array and single object responses
              const links = Array.isArray(linksData) ? linksData : [linksData]
              
              if (links.length > 0) {
                const primaryLink = links[0]
                console.log('Primary link object:', primaryLink)
                
                // Try multiple possible field names
                affiliateLink = primaryLink.url || 
                               primaryLink.link || 
                               primaryLink.trackingUrl ||
                               (primaryLink.slug ? `https://app.thebettinginsider.com?ref=${primaryLink.slug}` : null) ||
                               (primaryLink.code ? `https://app.thebettinginsider.com?ref=${primaryLink.code}` : null)
                
                console.log('Extracted affiliate link:', affiliateLink)
              }
            } catch (parseError) {
              console.error('Error parsing links response:', parseError)
            }
          } else {
            console.error('Links API failed or empty. Status:', linksResponse.status)
          }
        } catch (linkError) {
          console.error('Error fetching affiliate links:', linkError)
        }
      }
      
      // UPDATE SUPABASE WITH EXTRACTED LINK!
      if (affiliateLink && cachedAffiliate) {
        console.log('Updating Supabase cache with extracted link:', affiliateLink)
        await supabase
          .from('affiliate_links')
          .update({ link: affiliateLink, updated_at: new Date().toISOString() })
          .eq('email', email)
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

