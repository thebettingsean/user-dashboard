import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata,
      unsafeMetadata: user.unsafeMetadata
    })
  } catch (error) {
    console.error('Error fetching Clerk metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}

