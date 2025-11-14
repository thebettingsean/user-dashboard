'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewDashboardRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to /sports (the new dashboard landing page)
    router.replace('/sports')
  }, [router])
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #050e1f 0%, #040b1a 100%)'
    }}>
      <div style={{ color: 'white', fontSize: '1rem' }}>
        Redirecting...
      </div>
    </div>
  )
}
