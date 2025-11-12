import { Metadata } from 'next'
import { sportNames } from '../../lib/utils/seoMetadata'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ sport: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { sport } = await params
  const sportName = sportNames[sport.toLowerCase()] || sport.toUpperCase()
  
  return {
    title: `${sportName} Dashboard | The Betting Insider`,
    description: `Access ${sportName} games, expert picks, AI scripts, public betting data, and player props all in one place.`
  }
}

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

