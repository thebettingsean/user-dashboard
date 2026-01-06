import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

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

// GET /api/nfl-playoffs/groups?groupId=xxx - Get group info
// GET /api/nfl-playoffs/groups?userId=xxx - Get user's groups
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const searchParams = request.nextUrl.searchParams
    const groupId = searchParams.get('groupId')
    const userIdParam = searchParams.get('userId')

    if (groupId) {
      // Get specific group with members
      const { data: group, error: groupError } = await supabaseUsers
        .from('nfl_playoff_groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError || !group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      // Get members
      const { data: members, error: membersError } = await supabaseUsers
        .from('nfl_playoff_group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('Error fetching members:', membersError)
      }

      // Fetch user display names from Clerk
      const clerk = await clerkClient()
      const membersWithNames = await Promise.all(
        (members || []).map(async (member) => {
          try {
            const user = await clerk.users.getUser(member.user_id)
            const displayName = getDisplayName(user)
            return {
              ...member,
              userDisplayName: displayName,
            }
          } catch (error) {
            console.error(`Error fetching user ${member.user_id}:`, error)
            return {
              ...member,
              userDisplayName: `User ${member.user_id.slice(0, 8)}...`,
            }
          }
        })
      )

      return NextResponse.json({
        group,
        members: membersWithNames,
      })
    } else if (userIdParam || userId) {
      // Get user's groups
      const targetUserId = userIdParam || userId
      if (!targetUserId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
      }

      const { data: memberships, error } = await supabaseUsers
        .from('nfl_playoff_group_members')
        .select(`
          *,
          nfl_playoff_groups (*)
        `)
        .eq('user_id', targetUserId)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Error fetching user groups:', error)
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
      }

      return NextResponse.json({ groups: memberships || [] })
    } else {
      return NextResponse.json({ error: 'groupId or userId required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/nfl-playoffs/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/nfl-playoffs/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    // Check if name already exists
    const { data: existingGroup } = await supabaseUsers
      .from('nfl_playoff_groups')
      .select('id')
      .eq('name', name.trim())
      .single()

    if (existingGroup) {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 409 })
    }

    // Create group
    const { data: group, error: groupError } = await supabaseUsers
      .from('nfl_playoff_groups')
      .insert({
        name: name.trim(),
        created_by: userId,
      })
      .select()
      .single()

    if (groupError || !group) {
      console.error('Error creating group:', groupError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    // Add creator as member
    const { error: memberError } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
      })

    if (memberError) {
      console.error('Error adding creator as member:', memberError)
      // Group was created, so we'll still return success
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error in POST /api/nfl-playoffs/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

