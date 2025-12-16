'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Don't show global navbar on public-betting page
  if (pathname === '/public-betting') {
    return null
  }
  
  return <Navbar />
}

