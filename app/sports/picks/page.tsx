'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SportsPicksRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/picks')
  }, [router])
  
  return null
}
