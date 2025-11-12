import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Select Your Sport | The Betting Insider',
  description: 'Access expert picks, AI game scripts, public betting data, and analytics for NFL, NBA, NHL, MLB, and college sports.',
  openGraph: {
    title: 'Select Your Sport | The Betting Insider',
    description: 'Access expert picks, AI game scripts, public betting data, and analytics for NFL, NBA, NHL, MLB, and college sports.',
    type: 'website',
    siteName: 'The Betting Insider'
  }
}

export default function RootSportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

