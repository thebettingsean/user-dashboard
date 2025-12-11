import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseUsers } from '@/lib/supabase-users'

// GET - List all saved queries for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Optional filters from query params
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabaseUsers
      .from('saved_queries')
      .select('*')
      .eq('clerk_user_id', userId)
    
    // Apply optional filters
    if (sport) {
      query = query.eq('sport', sport)
    }
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved queries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved queries', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      queries: data || []
    })
  } catch (error: any) {
    console.error('Error in GET /api/saved-queries:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new saved query
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, query_config, last_result_summary, sport = 'nfl', build_type = 'trends' } = body

    if (!name || !query_config) {
      return NextResponse.json(
        { error: 'Name and query_config are required' },
        { status: 400 }
      )
    }

    // Check if a query with this name already exists for this user
    const { data: existing } = await supabaseUsers
      .from('saved_queries')
      .select('id')
      .eq('clerk_user_id', userId)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A saved query with this name already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseUsers
      .from('saved_queries')
      .insert({
        clerk_user_id: userId,
        name,
        description: description || null,
        query_config,
        sport,
        build_type,
        is_active: true,
        is_public: false,
        last_result_summary: last_result_summary || null,
        run_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating saved query:', error)
      return NextResponse.json(
        { error: 'Failed to create saved query', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query: data
    })
  } catch (error: any) {
    console.error('Error in POST /api/saved-queries:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

