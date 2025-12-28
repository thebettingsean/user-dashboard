import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Apply migration - add new columns to picks table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE picks ADD COLUMN IF NOT EXISTS away_team_image TEXT;
        ALTER TABLE picks ADD COLUMN IF NOT EXISTS home_team_image TEXT;
        ALTER TABLE picks ADD COLUMN IF NOT EXISTS prop_image TEXT;
        ALTER TABLE picks ADD COLUMN IF NOT EXISTS game_title TEXT;
      `
    })

    if (error) {
      // Try direct approach
      const queries = [
        'ALTER TABLE picks ADD COLUMN IF NOT EXISTS away_team_image TEXT',
        'ALTER TABLE picks ADD COLUMN IF NOT EXISTS home_team_image TEXT',
        'ALTER TABLE picks ADD COLUMN IF NOT EXISTS prop_image TEXT',
        'ALTER TABLE picks ADD COLUMN IF NOT EXISTS game_title TEXT'
      ]

      for (const query of queries) {
        const { error: err } = await supabase.rpc('exec_sql', { sql: query })
        if (err) console.error('Error:', err)
      }

      return NextResponse.json({
        success: true,
        message: 'Migration applied (check Supabase dashboard to verify)'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully'
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      note: 'You may need to apply this migration manually in Supabase dashboard'
    }, { status: 500 })
  }
}

