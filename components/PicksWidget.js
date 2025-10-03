'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PicksWidget() {
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  useEffect(() => {
    fetchPicks()
  }, [])

  async function fetchPicks() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data } = await supabase
      .from('picks')
      .select('*, bettors(name, record, win_streak)')
      .gte('game_time', today.toISOString())
      .order('units', { ascending: false })
      .limit(20)

    if (data) setPicks(data)
    setLoading(false)
  }

  const topUnitsPicks = picks.slice(0, 3)
  const hottestBettor = picks.reduce((acc, pick) => {
    if (!acc || (pick.bettors?.win_streak > acc.bettors?.win_streak)) return pick
    return acc
  }, null)
  const hottestBettorPicks = hottestBettor ? 
    picks.filter(p => p.bettors?.name === hottestBettor.bettors?.name).slice(0, 3) : []

  return (
    <div style={widgetStyle}>
      <div style={iconWrapper}>
        <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7becb3f2815198790_1.svg" 
             style={{ width: '36px', height: '36px' }} />
      </div>
      
      <h2 style={titleStyle}>
        Our Bets Today
        <span style={dateTag}>{today}</span>
      </h2>
      <p style={taglineStyle}>Top spots from the Insider team</p>
      
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={sectionStyle}>
            <h4 style={sectionTitle}>Most at Risk</h4>
            {topUnitsPicks.map(pick => (
              <div key={pick.id} style={pickItemStyle}>
                <span style={unitsStyle}>{pick.units}u</span>
                <span style={{ fontSize: '0.8rem' }}>{pick.bet_title}</span>
              </div>
            ))}
          </div>

          {hottestBettor && (
            <div style={sectionStyle}>
              <h4 style={sectionTitle}>
                Hottest: {hottestBettor.bettors?.name} ({hottestBettor.bettors?.record})
              </h4>
              {hottestBettorPicks.map(pick => (
                <div key={pick.id} style={pickItemStyle}>
                  <span style={unitsStyle}>{pick.units}u</span>
                  <span style={{ fontSize: '0.8rem' }}>{pick.bet_title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <a href="https://thebettinginsider.com/betting/dashboard" style={viewAllStyle}>
        view all →
      </a>
    </div>
  )
}

// Styles remain the same
const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(255, 202, 16, 0.12) 0%, rgba(255, 202, 16, 0.04) 100%)',
  border: '1px solid rgba(255, 202, 16, 0.2)',
  borderRadius: '16px',
  padding: '1.5rem',
  position: 'relative',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
}

const iconWrapper = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '48px',
  height: '48px',
  border: '1px solid rgba(255, 202, 16, 0.3)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 202, 16, 0.05)',
  zIndex: 2
}

const titleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  marginBottom: '0.25rem',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const dateTag = {
  background: 'rgba(255, 202, 16, 0.2)',
  color: '#ffca10',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const sectionStyle = {
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)'
}

const sectionTitle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  opacity: 0.5,
  marginBottom: '0.5rem',
  letterSpacing: '0.05em'
}

const pickItemStyle = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  padding: '0.35rem 0'
}

const unitsStyle = {
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#60a5fa',
  padding: '0.15rem 0.4rem',
  borderRadius: '4px',
  fontSize: '0.7rem',
  fontWeight: '700'
}

const viewAllStyle = {
  position: 'absolute',
  bottom: '1.5rem',
  right: '1.5rem',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  textDecoration: 'none'
}