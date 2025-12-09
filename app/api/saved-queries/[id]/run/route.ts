import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// POST - Mark a saved query as run (increment run count and update last_run_at)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { last_result_summary } = body

    // Verify the query belongs to the user
    const { data: existing } = await supabaseUsers
      .from('saved_queries')
      .select('id, run_count')
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved query not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      last_run_at: new Date().toISOString(),
      run_count: (existing.run_count || 0) + 1,
      updated_at: new Date().toISOString()
    }
    
    if (last_result_summary !== undefined) {
      updateData.last_result_summary = last_result_summary
    }

    const { data, error } = await supabaseUsers
      .from('saved_queries')
      .update(updateData)
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved query run info:', error)
      return NextResponse.json(
        { error: 'Failed to update saved query', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query: data
    })
  } catch (error: any) {
    console.error('Error in POST /api/saved-queries/[id]/run:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

