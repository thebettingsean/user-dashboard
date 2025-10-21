import { createClient } from '@supabase/supabase-js'

// This is the FUNNEL ANALYTICS Supabase project
// Used exclusively for cancellation tracking and analytics
const supabaseUrl = process.env.SUPABASE_FUNNEL_URL || 'https://pkmqhozyorpmteytizut.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_FUNNEL_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbXFob3p5b3JwbXRleXRpenV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzIyMSwiZXhwIjoyMDc1NDE5MjIxfQ.uTxRZAUpNbhRFB9rIikggnEZeGMVfG7xQGn1nE4nVAc'

// Create a Supabase client for funnel analytics
export const supabaseFunnel = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

