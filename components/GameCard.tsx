'use client'

import { useState } from 'react'

interface GameCardProps {
  gameId: string
  sport: string
  awayTeam: string
  homeTeam: string
  gameTime: string
  awayTeamLogo?: string
  homeTeamLogo?: string
  onAnalyze: (gameId: string) => void
}

export default function GameCard({
  gameId,
  sport,
  awayTeam,
  homeTeam,
  gameTime,
  awayTeamLogo,
  homeTeamLogo,
  onAnalyze
}: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Format time
  const time = new Date(gameTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  })
  
  const date = new Date(gameTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  })
  
  return (
    <div
      style={{
        ...cardStyle,
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered 
          ? '0 12px 40px 0 rgba(0, 0, 0, 0.45)' 
          : '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={sportTagStyle}>{sport}</div>
      
      <div style={matchupStyle}>
        <div style={teamStyle}>
          {awayTeamLogo && (
            <img src={awayTeamLogo} alt={awayTeam} style={logoStyle} />
          )}
          <span style={teamNameStyle}>{awayTeam}</span>
        </div>
        
        <span style={vsStyle}>@</span>
        
        <div style={teamStyle}>
          {homeTeamLogo && (
            <img src={homeTeamLogo} alt={homeTeam} style={logoStyle} />
          )}
          <span style={teamNameStyle}>{homeTeam}</span>
        </div>
      </div>
      
      <div style={timeStyle}>
        {date} • {time} EST
      </div>
      
      <button
        style={{
          ...buttonStyle,
          background: isHovered 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'rgba(139, 92, 246, 0.2)'
        }}
        onClick={() => onAnalyze(gameId)}
      >
        GET SCRIPT →
      </button>
    </div>
  )
}

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(30px) saturate(180%)',
  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  border: '0.5px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '1.25rem',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.75rem',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
}

const sportTagStyle = {
  position: 'absolute' as const,
  top: '0.75rem',
  right: '0.75rem',
  fontSize: '0.65rem',
  fontWeight: '700',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
  background: 'rgba(139, 92, 246, 0.25)',
  color: '#a78bfa',
  border: '1px solid rgba(139, 92, 246, 0.3)'
}

const matchupStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.5rem',
  marginTop: '0.5rem'
}

const teamStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const logoStyle = {
  width: '24px',
  height: '24px',
  objectFit: 'contain' as const
}

const teamNameStyle = {
  fontSize: '0.95rem',
  fontWeight: '600',
  color: '#fff'
}

const vsStyle = {
  fontSize: '0.75rem',
  opacity: 0.5,
  alignSelf: 'center' as const
}

const timeStyle = {
  fontSize: '0.75rem',
  opacity: 0.6,
  color: '#fff'
}

const buttonStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  color: '#fff',
  fontSize: '0.85rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  marginTop: '0.25rem'
}

