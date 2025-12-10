'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Redirect component
function RedirectToBuilder() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const params = searchParams.toString()
    router.replace(`/builder${params ? `?${params}` : ''}`)
  }, [router, searchParams])
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0a0a14',
      color: '#888'
    }}>
      Redirecting to Builder...
    </div>
  )
}

export default function SportsEnginePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a14' }} />}>
      <RedirectToBuilder />
    </Suspense>
  )
}
