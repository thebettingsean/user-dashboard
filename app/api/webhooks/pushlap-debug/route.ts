import { NextRequest, NextResponse } from 'next/server'

// Store last webhook payload in memory for debugging
let lastWebhookPayload: any = null

export async function GET(request: NextRequest) {
  return NextResponse.json({
    lastPayload: lastWebhookPayload,
    timestamp: lastWebhookPayload ? new Date().toISOString() : null
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Store for debugging
    lastWebhookPayload = payload
    
    // Log full payload
    console.log('=== FULL WEBHOOK PAYLOAD ===')
    console.log(JSON.stringify(payload, null, 2))
    console.log('=== END PAYLOAD ===')
    
    // Check if link exists in payload
    console.log('body.link:', payload.body?.link)
    console.log('body.affiliateLinks:', payload.body?.affiliateLinks)
    
    // Extract from affiliateLinks array
    let extractedLink = payload.body?.link
    
    if (!extractedLink && payload.body?.affiliateLinks && payload.body.affiliateLinks.length > 0) {
      const latestLink = payload.body.affiliateLinks[payload.body.affiliateLinks.length - 1]
      console.log('Latest link object from array:', latestLink)
      const slug = latestLink.link || latestLink.slug || latestLink.code
      console.log('Extracted slug:', slug)
      
      if (slug) {
        extractedLink = `https://thebettinginsider.com?ref=${slug}`
        console.log('✅ BUILT LINK:', extractedLink)
      }
    }
    
    if (extractedLink) {
      console.log('✅ FINAL LINK:', extractedLink)
    } else {
      console.log('❌ NO LINK COULD BE EXTRACTED')
      console.log('Body keys:', Object.keys(payload.body || {}))
    }

    return NextResponse.json({ 
      success: true,
      receivedLink: extractedLink,
      rawLink: payload.body?.link,
      affiliateLinksArray: payload.body?.affiliateLinks
    })

  } catch (error) {
    console.error('Debug webhook error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

