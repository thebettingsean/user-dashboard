// This page will contain the content from /bets
// For now, redirecting to /bets to keep functionality working

import { redirect } from 'next/navigation'

export default function BettingAbout() {
  redirect('/bets')
}

