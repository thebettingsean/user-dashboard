import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// DELETE /api/nfl-playoffs/groups/[groupId] - Delete a group (only if user is creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> | { groupId: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 14 vs 15+)
    const resolvedParams = await Promise.resolve(params)
    const { groupId } = resolvedParams

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Check if group exists and user is the creator
    const { data: group, error: groupError } = await supabaseUsers
      .from('nfl_playoff_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.created_by !== userId) {
      return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 })
    }

    // Delete the group (cascade will delete members and brackets)
    const { error: deleteError } = await supabaseUsers
      .from('nfl_playoff_groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/nfl-playoffs/groups/[groupId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

