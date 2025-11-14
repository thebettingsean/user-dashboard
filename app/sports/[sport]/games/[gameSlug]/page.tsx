'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSubscription } from '../../../../../lib/hooks/useSubscription'
import styles from './gamePage.module.css'

interface GameData {
  id: string
  sport: string
  awayTeam: string
  homeTeam: string
  awayTeamLogo: string | null
  homeTeamLogo: string | null
  kickoff: string
  kickoffLabel: string
  spread: any
  totals: any
  moneyline: any
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const sport = params.sport as string
  const gameSlug = params.gameSlug as string
  
  const { isSignedIn } = useUser()
  const { isSubscribed } = useSubscription()
  
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Default to data tab
  useEffect(() => {
    router.replace(`/new/${sport}/games/${gameSlug}/data`)
  }, [router, sport, gameSlug])
  
  return (
    <div className={styles.container}>
      <div className={styles.loading}>Loading game...</div>
    </div>
  )
}

