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

  const topUnitsPicks = picks.slice(0, 2)
  const hottestBettor = picks.reduce((acc, pick) => {
    if (!acc || (pick.bettors?.win_streak > acc.bettors?.win_streak)) return pick
    return acc
  }, null)
  const hottestBettorPicks = hottestBettor ? 
    picks.filter(p => p.bettors?.name === hottestBettor.bettors?.name).slice(0, 2) : []

  return (
    <a href="https://dashboard.thebettinginsider.com/analyst-picks" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', color: 'inherit' }}>
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
            <div style={hottestBettor ? sectionStyle : {...sectionStyle, borderBottom: 'none', paddingBottom: '1rem'}}>
              <h4 style={sectionTitle}>Most at Risk</h4>
              {topUnitsPicks.map(pick => (
                <div key={pick.id} style={pickItemStyle}>
                  <span style={unitsStyle}>{pick.units}u</span>
                  <span style={{ fontSize: '0.8rem' }}>{pick.bet_title}</span>
                </div>
              ))}
            </div>

            {hottestBettor && (
              <div style={{...sectionStyle, borderBottom: 'none', paddingBottom: '1rem'}}>
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
      </div>
    </a>
  )
}

const widgetStyle = {
  background: 'linear-gradient(135deg, rgba(14, 23, 42, 0.1) 0%, transparent 50%), rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(50px) saturate(180%)',
  WebkitBackdropFilter: 'blur(50px) saturate(180%)',
  border: 'none',
  borderRadius: '24px',
  padding: '1.5rem',
  position: 'relative',
  minHeight: '320px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const iconWrapper = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  width: '52px',
  height: '52px',
  border: '1.5px solid rgba(255, 202, 16, 0.4)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255, 202, 16, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: '0 4px 16px rgba(255, 202, 16, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
  background: 'rgba(255, 202, 16, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#fbbf24',
  padding: '0.3rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.65rem',
  fontWeight: '700',
  border: '1px solid rgba(255, 202, 16, 0.3)',
  boxShadow: '0 2px 8px rgba(255, 202, 16, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}

const taglineStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  marginBottom: '1rem'
}

const sectionStyle = {
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  padding: '0.75rem',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.05)'
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
  background: 'rgba(59, 130, 246, 0.25)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#60a5fa',
  padding: '0.25rem 0.5rem',
  borderRadius: '6px',
  fontSize: '0.7rem',
  fontWeight: '700',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
}

const viewAllStyle = {
  position: 'absolute',
  bottom: '1.5rem',
  right: '1.5rem',
  left: '1.5rem',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.8rem',
  fontWeight: '600',
  textDecoration: 'none'
}