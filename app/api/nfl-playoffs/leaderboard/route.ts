import { NextRequest, NextResponse } from 'next/server'
import { supabaseUsers } from '@/lib/supabase-users'

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

    // Get user info for each bracket (we'll need to fetch from Clerk or store names)
    // For now, we'll just return the brackets with user_id
    // You can enhance this later to include user names/emails

    return NextResponse.json({ leaderboard: brackets || [] })
  } catch (error) {
    console.error('Error in GET /api/nfl-playoffs/leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

