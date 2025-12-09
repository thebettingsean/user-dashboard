import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// GET - Get a specific saved query
export async function GET(
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

    const { data, error } = await supabaseUsers
      .from('saved_queries')
      .select('*')
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Saved query not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching saved query:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved query', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query: data
    })
  } catch (error: any) {
    console.error('Error in GET /api/saved-queries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update a saved query
export async function PUT(
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
    const { name, description, query_config, last_result_summary } = body

    // Verify the query belongs to the user
    const { data: existing } = await supabaseUsers
      .from('saved_queries')
      .select('id, name')
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved query not found' },
        { status: 404 }
      )
    }

    // If name is being changed, check for conflicts
    if (name && name !== existing.name) {
      const { data: conflict } = await supabaseUsers
        .from('saved_queries')
        .select('id')
        .eq('clerk_user_id', userId)
        .eq('name', name)
        .neq('id', params.id)
        .single()

      if (conflict) {
        return NextResponse.json(
          { error: 'A saved query with this name already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (query_config !== undefined) updateData.query_config = query_config
    if (last_result_summary !== undefined) updateData.last_result_summary = last_result_summary

    const { data, error } = await supabaseUsers
      .from('saved_queries')
      .update(updateData)
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating saved query:', error)
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
    console.error('Error in PUT /api/saved-queries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a saved query
export async function DELETE(
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

    // Verify the query belongs to the user
    const { data: existing } = await supabaseUsers
      .from('saved_queries')
      .select('id')
      .eq('id', params.id)
      .eq('clerk_user_id', userId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved query not found' },
        { status: 404 }
      )
    }

    const { error } = await supabaseUsers
      .from('saved_queries')
      .delete()
      .eq('id', params.id)
      .eq('clerk_user_id', userId)

    if (error) {
      console.error('Error deleting saved query:', error)
      return NextResponse.json(
        { error: 'Failed to delete saved query', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Saved query deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/saved-queries/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

