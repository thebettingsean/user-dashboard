'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RedirectToBuilder() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const params = searchParams.toString()
    router.replace(`/builder/teams${params ? `?${params}` : ''}`)
  }, [router, searchParams])
  
  return null
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedirectToBuilder />
    </Suspense>
  )
}
