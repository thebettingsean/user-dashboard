'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OddsRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/odds/nfl/spreads')
  }, [router])
  
  return null
}
