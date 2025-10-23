import { NextRequest, NextResponse } from 'next/server'

const PUSHLAP_API_KEY = '7722240d-19d5-410f-8a78-8c7136107ab9'
const PUSHLAP_API_URL = 'https://www.pushlapgrowth.com/api/v1'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email } = await request.json()

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Create affiliate in Pushlap
    const response = await fetch(`${PUSHLAP_API_URL}/affiliates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUSHLAP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        commissionRate: 50 // 50% commission
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Pushlap API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to create affiliate', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        name: data.name || `${data.firstName} ${data.lastName}`,
        email: data.email,
        commissionRate: data.commissionRate,
        link: data.link,
        status: data.status,
        detailsComplete: data.detailsComplete || false,
        payoutEmail: data.payoutEmail || null,
        paymentMethod: data.paymentMethod || null,
        totalCommissionEarned: data.totalCommissionEarned || 0,
        numberOfReferredUsers: data.numberOfReferredUsers || 0,
        numberOfClicks: data.numberOfClicks || 0
      }
    })

  } catch (error) {
    console.error('Error creating affiliate:', error)
    return NextResponse.json(
      { error: 'Failed to create affiliate' },
      { status: 500 }
    )
  }
}

