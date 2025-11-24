import { NextResponse } from 'next/server';
import { supabaseUsers } from '@/lib/supabase-users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      userType,
      eventType,
      sport,
      metadata,
    } = body;

    // Validate required fields
    if (!sessionId || !userType || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userType, eventType' },
        { status: 400 }
      );
    }

    // Validate userType
    if (!['free', 'paid'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid userType. Must be "free" or "paid"' },
        { status: 400 }
      );
    }

    // Validate eventType
    const validEventTypes = ['page_view', 'simulation_ran', 'versus_link_clicked', 'popup_shown', 'popup_clicked'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate sport for simulation_ran events
    if (eventType === 'simulation_ran' && !sport) {
      return NextResponse.json(
        { error: 'Sport is required for simulation_ran events' },
        { status: 400 }
      );
    }

    // Insert event into simulator_events table
    const { error } = await supabaseUsers
      .from('simulator_events')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        user_type: userType,
        event_type: eventType,
        sport: sport || null,
        metadata: metadata || null,
      });

    if (error) {
      console.error('[Simulator Track API] Supabase error:', error);
      throw new Error(`Failed to insert event: ${error.message}`);
    }

    console.log('[Simulator Track API] Event tracked:', {
      sessionId,
      userId: userId || 'anonymous',
      userType,
      eventType,
      sport: sport || 'N/A',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Simulator Track API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch simulation count for a session (for generation limit check)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // Count simulation_ran events for this session
    const { count, error } = await supabaseUsers
      .from('simulator_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('event_type', 'simulation_ran');

    if (error) {
      console.error('[Simulator Track API] Supabase error:', error);
      throw new Error(`Failed to fetch simulation count: ${error.message}`);
    }

    console.log('[Simulator Track API] Simulation count for session', sessionId, ':', count);

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('[Simulator Track API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

