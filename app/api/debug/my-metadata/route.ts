import { NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'

/**
 * DEBUG ENDPOINT - Shows user's raw Clerk metadata
 * GET /api/debug/my-metadata
 */
export async function GET() {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated',
        message: 'Please sign in to view your metadata'
      }, { status: 401 })
    }

    // Fetch fresh user data from Clerk
    const clerk = await clerkClient()
    const freshUser = await clerk.users.getUser(user.id)

    return NextResponse.json({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      privateMetadata: freshUser.privateMetadata,
      publicMetadata: freshUser.publicMetadata,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

