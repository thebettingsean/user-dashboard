import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_USERS_URL || 'https://pkmqhozyorpmteytizut.supabase.co'
const supabaseKey = process.env.SUPABASE_USERS_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbXFob3p5b3JwbXRleXRpenV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzIyMSwiZXhwIjoyMDc1NDE5MjIxfQ.uTxRZAUpNbhRFB9rIikggnEZeGMVfG7xQGn1nE4nVAc'

export const supabaseUsers = createClient(supabaseUrl, supabaseKey)

// User type definition
export interface User {
  id: string
  clerk_user_id: string
  email: string | null
  stripe_customer_id: string | null
  ai_scripts_used: number
  ai_scripts_reset_at: string
  ai_scripts_limit: number
  created_at: string
  last_active_at: string
  is_premium: boolean
}

