import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// Check if deadline has passed (1:00pm EST Saturday before first game)
// For now, we'll set a hardcoded date - you can update this
const DEADLINE_DATE = new Date('2026-01-11T18:00:00Z') // 1:00pm EST = 6:00pm UTC on Saturday

function isDeadlinePassed(): boolean {
  return new Date() >= DEADLINE_DATE
}

// GET /api/nfl-playoffs/brackets?groupId=xxx&userId=xxx - Get bracket for user in group
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const searchParams = request.nextUrl.searchParams
    const groupId = searchParams.get('groupId')
    const userIdParam = searchParams.get('userId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    const targetUserId = userIdParam || userId
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data: bracket, error } = await supabaseUsers
      .from('nfl_playoff_brackets')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching bracket:', error)
      return NextResponse.json({ error: 'Failed to fetch bracket' }, { status: 500 })
    }

    return NextResponse.json({ bracket: bracket || null })
  } catch (error) {
    console.error('Error in GET /api/nfl-playoffs/brackets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/nfl-playoffs/brackets - Submit or update bracket
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, selections, name } = body

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json({ error: 'Selections are required' }, { status: 400 })
    }

    // Check if bracket already exists
    const { data: existingBracket } = await supabaseUsers
      .from('nfl_playoff_brackets')
      .select('id, name')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    // Name is required for new brackets, optional for updates
    if (!existingBracket && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Bracket name is required' }, { status: 400 })
    }

    // If name is provided, check uniqueness within the group
    if (name && name.trim().length > 0) {
      const bracketName = name.trim()
      const { data: nameConflict } = await supabaseUsers
        .from('nfl_playoff_brackets')
        .select('id')
        .eq('group_id', groupId)
        .eq('name', bracketName)
        .neq('user_id', userId) // Exclude current user's bracket
        .single()

      if (nameConflict) {
        return NextResponse.json({ error: 'Bracket name already exists in this group' }, { status: 409 })
      }
    }

    // Check if deadline has passed
    if (isDeadlinePassed()) {
      return NextResponse.json({ error: 'Deadline has passed. Bracket submissions are closed.' }, { status: 400 })
    }

    // Check if user is a member of the group
    const { data: membership } = await supabaseUsers
      .from('nfl_playoff_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'You must be a member of this group' }, { status: 403 })
    }

    if (existingBracket) {
      // Update existing bracket
      const updateData: any = {
        selections,
        updated_at: new Date().toISOString(),
      }
      
      // Update name if provided
      if (name && name.trim().length > 0) {
        updateData.name = name.trim()
      }

      const { data: bracket, error } = await supabaseUsers
        .from('nfl_playoff_brackets')
        .update(updateData)
        .eq('id', existingBracket.id)
        .select()
        .single()

      if (error || !bracket) {
        console.error('Error updating bracket:', error)
        return NextResponse.json({ error: 'Failed to update bracket' }, { status: 500 })
      }

      return NextResponse.json({ bracket, message: 'Bracket updated successfully' })
    } else {
      // Create new bracket - name is required
      const bracketName = name.trim()
      const { data: bracket, error } = await supabaseUsers
        .from('nfl_playoff_brackets')
        .insert({
          user_id: userId,
          group_id: groupId,
          name: bracketName,
          selections,
          score: 0,
        })
        .select()
        .single()

      if (error || !bracket) {
        console.error('Error creating bracket:', error)
        // Provide more detailed error message
        const errorMessage = error?.message || 'Unknown error'
        const errorCode = error?.code || 'UNKNOWN'
        console.error('Detailed error:', { errorMessage, errorCode, error })
        return NextResponse.json({ 
          error: 'Failed to create bracket', 
          details: errorMessage,
          code: errorCode
        }, { status: 500 })
      }

      return NextResponse.json({ bracket, message: 'Bracket submitted successfully' })
    }
  } catch (error) {
    console.error('Error in POST /api/nfl-playoffs/brackets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

