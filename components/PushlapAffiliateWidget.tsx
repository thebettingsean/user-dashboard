'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function PushlapAffiliateWidget() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    const email = user.emailAddresses[0]?.emailAddress
    if (!email) return

    // Check if script already exists
    if (document.querySelector('script[src*="affiliate-widget.js"]')) {
      return
    }

    // Create and load Pushlap Affiliate Widget script
    const script = document.createElement('script')
    script.src = 'https://www.pushlapgrowth.com/affiliate-widget.js'
    script.setAttribute('data-affiliate-program-id', '87f11ddf-fd49-4bc3-9130-d84475a34fc1')
    script.setAttribute('data-user-email', email)
    script.setAttribute('data-affiliate-widget', 'true')
    script.async = true

    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [isLoaded, user])

  return null // This component doesn't render anything
}

