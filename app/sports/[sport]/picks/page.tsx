'use client'

import { useParams } from 'next/navigation'
import DashboardLayout from '../components/DashboardLayout'

export default function PicksPage() {
  const params = useParams()
  const sport = params.sport as string

  return <DashboardLayout sport={sport} initialTab="picks" />
}

