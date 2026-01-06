import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// POST /api/nfl-playoffs/groups/leave - Leave a group
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId } = body

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabaseUsers
      .from('nfl_playoff_groups')
      .select('created_by')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Prevent creator from leaving (they should delete the group instead)
    if (group.created_by === userId) {
      return NextResponse.json({ error: 'Group creator cannot leave. Delete the group instead.' }, { status: 403 })
    }

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 404 })
    }

    // Remove user from group
    const { error: deleteError } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .delete()
      .eq('id', membership.id)

    if (deleteError) {
      console.error('Error leaving group:', deleteError)
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 })
    }

    // Also delete their bracket if they have one
    await supabaseUsers
      .from('nfl_playoff_brackets')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    return NextResponse.json({ message: 'Left group successfully' })
  } catch (error) {
    console.error('Error in POST /api/nfl-playoffs/groups/leave:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

