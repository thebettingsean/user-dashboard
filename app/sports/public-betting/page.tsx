'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PublicBettingRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/public-betting')
  }, [router])
  
  return null
}

