import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// POST /api/nfl-playoffs/groups/join - Join a group by ID
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
      .select('id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if already a member
    const { data: existingMember } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return NextResponse.json({ message: 'Already a member', groupId })
    }

    // Add user as member
    const { data: member, error: memberError } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
      })
      .select()
      .single()

    if (memberError || !member) {
      console.error('Error joining group:', memberError)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Successfully joined group', groupId })
  } catch (error) {
    console.error('Error in POST /api/nfl-playoffs/groups/join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

