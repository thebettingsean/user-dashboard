import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

const MAILMODO_API_KEY = 'X52G8DM-H3V44NW-NYB7PZ1-XXCDNKS'
const MAILMODO_API_URL = 'https://api.mailmodo.com/api/v1/addToList'

// This should be called by a cron job (e.g., daily via Vercel Cron)
// Add this to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/sync-free-users",
//     "schedule": "0 10 * * *"
//   }]
// }

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting free user sync...')

    const client = await clerkClient()
    
    // Get all users (you might want to paginate this for large user bases)
    const users = await client.users.getUserList({
      limit: 500, // Adjust as needed
    })

    let addedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const user of users.data) {
      const email = user.emailAddresses?.[0]?.emailAddress

      if (!email) {
        skippedCount++
        continue
      }

      // Check if user has a subscription
      const hasSubscription = 
        user.publicMetadata?.plan || 
        user.privateMetadata?.plan || 
        user.publicMetadata?.fantasyPlan || 
        user.privateMetadata?.fantasyPlan

      if (hasSubscription) {
        skippedCount++
        continue
      }

      // User is free - add to Mailmodo
      try {
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
              first_name: user.firstName || '',
              last_name: user.lastName || '',
              name: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
              clerk_user_id: user.id,
              synced_at: new Date().toISOString()
            },
            listName: 'Free Members'
          })
        })

        if (mailmodoResponse.ok) {
          addedCount++
          console.log('✅ Added to Mailmodo:', email)
        } else {
          const errorData = await mailmodoResponse.json()
          // If user already exists, that's fine
          if (errorData.message?.includes('already exists')) {
            skippedCount++
          } else {
            errorCount++
            console.error('❌ Mailmodo error for', email, ':', errorData)
          }
        }
      } catch (error) {
        errorCount++
        console.error('❌ Error processing', email, ':', error)
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('✅ Free user sync complete')
    console.log(`Added: ${addedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`)

    return NextResponse.json({
      success: true,
      summary: {
        total: users.data.length,
        added: addedCount,
        skipped: skippedCount,
        errors: errorCount
      }
    })

  } catch (error) {
    console.error('❌ Free user sync failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync free users' },
      { status: 500 }
    )
  }
}

