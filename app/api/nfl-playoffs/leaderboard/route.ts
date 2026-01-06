import { NextRequest, NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'
import { clerkClient } from '@clerk/nextjs/server'

// Helper function to get display name from Clerk user
function getDisplayName(user: any): string {
  // Try to get full name first
  if (user.firstName || user.lastName) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    if (fullName.trim()) return fullName.trim()
  }
  
  // Fallback to email prefix (before @)
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    const email = user.emailAddresses[0]?.emailAddress
    if (email) {
      const emailPrefix = email.split('@')[0]
      return emailPrefix
    }
  }
  
  return 'Unknown User'
}

// GET /api/nfl-playoffs/leaderboard?groupId=xxx - Get leaderboard for a group
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Get all brackets for this group, ordered by score descending
    const { data: brackets, error } = await supabaseUsers
      .from('nfl_playoff_brackets')
      .select('*')
      .eq('group_id', groupId)
      .order('score', { ascending: false })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    if (!brackets || brackets.length === 0) {
      return NextResponse.json({ leaderboard: [] })
    }

    // Fetch user info from Clerk for each bracket
    const clerk = await clerkClient()
    const leaderboardWithUsers = await Promise.all(
      brackets.map(async (bracket) => {
        try {
          const user = await clerk.users.getUser(bracket.user_id)
          const displayName = getDisplayName(user)
          return {
            ...bracket,
            userDisplayName: displayName,
          }
        } catch (error) {
          console.error(`Error fetching user ${bracket.user_id}:`, error)
          // Fallback: try to extract from user_id or use default
          return {
            ...bracket,
            userDisplayName: `User ${bracket.user_id.slice(0, 8)}...`,
          }
        }
      })
    )

    return NextResponse.json({ leaderboard: leaderboardWithUsers })
  } catch (error) {
    console.error('Error in GET /api/nfl-playoffs/leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

