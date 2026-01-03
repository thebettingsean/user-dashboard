'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PropsPageRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/picks')
  }, [router])
  
  return null
}

