import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best Sportsbooks 2025 | Top Betting Sites & Online Betting Websites',
  description: 'Find the best sportsbooks and top betting sites in 2025. Compare online betting websites, sports betting bonuses, and claim your free 30 days of expert picks from the best betting websites available.',
  keywords: 'sportsbook, best sportsbooks, bet sites, best betting sites, best betting websites, top betting websites, good betting websites, sports betting websites, sportsbook betting sites, online betting sites, online betting websites',
  openGraph: {
    type: 'website',
    title: 'Best Sportsbooks 2025 | Top Betting Sites & Online Betting Websites',
    description: 'Compare the best sportsbooks and online betting sites. Get exclusive bonuses and free expert picks from top betting websites.',
    url: 'https://thebettinginsider.com/sportsbooks',
    siteName: 'The Betting Insider',
    images: [
      {
        url: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6926245c49e1dc624bdc7317_insidertextlogo2.png',
        width: 1200,
        height: 630,
        alt: 'The Betting Insider - Best Sportsbooks',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Sportsbooks 2025 | Top Betting Sites',
    description: 'Find the best sportsbooks and online betting websites with exclusive bonuses and expert picks.',
    creator: '@invisiblestats',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SportsbooksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

