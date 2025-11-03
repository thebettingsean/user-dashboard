import { NextRequest, NextResponse } from 'next/server'

const MAILMODO_API_KEY = 'X52G8DM-H3V44NW-NYB7PZ1-XXCDNKS'
const MAILMODO_API_URL = 'https://api.mailmodo.com/api/v1/addToList'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, firstName, lastName } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Add user to Mailmodo "Free Members" list
    const mailmodoResponse = await fetch(MAILMODO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'mmApiKey': MAILMODO_API_KEY
      },
      body: JSON.stringify({
        email: email,
        data: {
          first_name: firstName || '',
          last_name: lastName || '',
          name: [firstName, lastName].filter(Boolean).join(' ') || ''
        },
        listName: 'Free Members'
      })
    })

    if (!mailmodoResponse.ok) {
      const errorData = await mailmodoResponse.json()
      console.error('Mailmodo API error:', errorData)
      
      // Don't fail the whole request if Mailmodo fails
      // Just log it and continue
      return NextResponse.json({
        success: true,
        warning: 'User processed but Mailmodo sync failed'
      })
    }

    const mailmodoData = await mailmodoResponse.json()
    console.log('✅ User added to Mailmodo Free Members list:', email)

    return NextResponse.json({
      success: true,
      message: 'User added to Mailmodo',
      data: mailmodoData
    })

  } catch (error) {
    console.error('Error adding user to Mailmodo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add user to Mailmodo' },
      { status: 500 }
    )
  }
}

