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
    if (payload.body && payload.body.link) {
      console.log('✅ LINK FOUND:', payload.body.link)
    } else {
      console.log('❌ NO LINK IN PAYLOAD')
      console.log('Body keys:', Object.keys(payload.body || {}))
    }

    return NextResponse.json({ 
      success: true,
      receivedLink: payload.body?.link || null 
    })

  } catch (error) {
    console.error('Debug webhook error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

