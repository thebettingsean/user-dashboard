'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BettingDashboard() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if user has a last sport preference
    const lastSport = typeof window !== 'undefined' ? localStorage.getItem('lastSport') : null
    
    if (lastSport) {
      // Returning user → Take them to their last sport
      router.replace(`/sports/${lastSport}/games`)
    } else {
      // New user → Default to NFL
      router.replace('/sports/nfl/games')
    }
  }, [router])
  
  // Show loading state while redirecting
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #050e1f 0%, #040b1a 100%)'
    }}>
      <div style={{ color: 'white', fontSize: '1rem' }}>
        Loading your dashboard...
      </div>
    </div>
  )
}

