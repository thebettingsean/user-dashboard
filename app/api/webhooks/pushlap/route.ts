import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use Funnel Analytics Supabase for affiliate data
const supabaseUrl = process.env.SUPABASE_FUNNEL_URL!
const supabaseKey = process.env.SUPABASE_FUNNEL_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    console.log('Pushlap webhook received:', JSON.stringify(payload, null, 2))

    const { event, body } = payload

    // Handle affiliate.created and affiliate.updated
    if (event === 'affiliate.created' || event === 'affiliate.updated') {
      console.log('=== PROCESSING AFFILIATE EVENT ===')
      console.log('body.link:', body.link)
      console.log('body.affiliateLinks:', JSON.stringify(body.affiliateLinks, null, 2))
      
      // Extract link from affiliateLinks array
      let affiliateLink = body.link
      
      if (!affiliateLink && body.affiliateLinks && body.affiliateLinks.length > 0) {
        console.log('Extracting from affiliateLinks array...')
        // Use the LAST link (most recent)
        const latestLink = body.affiliateLinks[body.affiliateLinks.length - 1]
        console.log('Latest link object:', JSON.stringify(latestLink, null, 2))
        
        const slug = latestLink.link || latestLink.slug || latestLink.code
        console.log('Extracted slug:', slug)
        
        if (slug) {
          affiliateLink = `https://thebettinginsider.com?ref=${slug}`
          console.log('✅ Built affiliate link:', affiliateLink)
        } else {
          console.log('❌ No slug found in link object')
        }
      } else {
        console.log('❌ No affiliateLinks array or body.link already set')
      }
      
      const affiliateData = {
        email: body.email,
        affiliate_id: body.id,
        link: affiliateLink,
        first_name: body.firstName,
        last_name: body.lastName,
        status: body.status,
        commission_rate: body.commissionRate,
        total_commission_earned: body.totalCommissionEarned || 0,
        number_of_referred_users: body.numberOfReferredUsers || 0,
        number_of_clicks: body.numberOfClicks || 0,
        details_complete: body.detailsComplete || false,
        payout_email: body.payoutEmail,
        payment_method: body.paymentMethod,
        updated_at: new Date().toISOString()
      }

      console.log('Storing affiliate data:', affiliateData)

      // Upsert into Supabase
      const { data, error } = await supabase
        .from('affiliate_links')
        .upsert(affiliateData, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to store affiliate data', details: error },
          { status: 500 }
        )
      }

      console.log('Successfully stored affiliate:', data)

      return NextResponse.json({ 
        success: true, 
        message: 'Affiliate data stored',
        event 
      })
    }

    // Handle sale.created and sale.updated for real-time earnings updates
    if (event === 'sale.created' || event === 'sale.updated') {
      const { affiliateId, commissionEarned, totalEarned } = body

      if (affiliateId) {
        // Update total earnings
        const { error } = await supabase
          .from('affiliate_links')
          .update({ 
            total_commission_earned: totalEarned || commissionEarned,
            updated_at: new Date().toISOString()
          })
          .eq('affiliate_id', affiliateId)

        if (error) {
          console.error('Error updating earnings:', error)
        } else {
          console.log(`Updated earnings for affiliate ${affiliateId} (${event})`)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: event === 'sale.created' ? 'Sale created' : 'Sale updated',
        event 
      })
    }

    // Handle other events
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received',
      event 
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

