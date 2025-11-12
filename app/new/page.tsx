'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy /new route - redirects to new SEO-friendly structure
 * 
 * This page now redirects to /nfl/games (default)
 * Dashboard logic has been moved to /[sport]/components/DashboardLayout.tsx
 */
export default function LegacyNewPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to NFL games by default (most popular)
    router.replace('/nfl/games')
  }, [router])
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #151b2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.25rem'
    }}>
      Redirecting to new dashboard...
    </div>
  )
}
