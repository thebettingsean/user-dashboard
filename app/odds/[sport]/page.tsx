'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function OddsSportRedirect() {
  const params = useParams()
  const router = useRouter()
  const sportParam = (params?.sport as string) || 'nfl'
  
  useEffect(() => {
    router.replace(`/odds/${sportParam}/spreads`)
  }, [sportParam, router])
  
  return null
}
