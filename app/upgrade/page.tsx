'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UpgradePage() {
  const router = useRouter()

  useEffect(() => {
    // Trigger the unlock modal on the main page
    if (typeof window !== 'undefined' && (window as any).showUnlockModal) {
      (window as any).showUnlockModal()
    }
    // Redirect back to homepage
    router.push('/')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0a1628 60%, #1a2642 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        color: '#fff',
        fontSize: '1.2rem',
        fontWeight: '600'
      }}>
        Redirecting...
      </div>
    </div>
  )
}
