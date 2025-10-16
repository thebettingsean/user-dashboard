'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '../lib/hooks/useSubscription'
import LockedWidget from '../components/LockedWidget'
import PicksWidget from '../components/PicksWidget'
import StatsWidget from '../components/StatsWidget'
import MatchupWidget from '../components/MatchupWidget'
import FantasyWidget from '../components/FantasyWidget'
import TDWidget from '../components/TDWidget'
import NewsWidget from '../components/NewsWidget'
import PropParlayWidget from '../components/PropParlayWidget'

export default function Home() {
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const { isLoading, isSubscribed, firstName } = useSubscription()

  useEffect(() => {
    if (!isLoading) {
      setWelcomeMessage(getWelcomeMessage(firstName))
    }
  }, [isLoading, firstName])

  function toggleWidget(widgetId: string) {
    const newExpanded = new Set(expandedWidgets)
    if (newExpanded.has(widgetId)) {
      newExpanded.delete(widgetId)
    } else {
      newExpanded.add(widgetId)
    }
    setExpandedWidgets(newExpanded)
  }

  // If still loading, show a loading state
  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'white', opacity: 0.7 }}>Loading...</p>
      </div>
    )
  }

  const row1Widgets = [
    { 
      id: 'picks', 
      title: 'Picks Dashboard', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7becb3f2815198790_1.svg',
      borderColor: 'rgba(255, 202, 16, 0.6)',
      background: 'linear-gradient(135deg, rgba(255, 202, 16, 0.15) 0%, rgba(255, 202, 16, 0.08) 100%)',
      component: <PicksWidget /> 
    },
    { 
      id: 'stats', 
      title: 'Public Betting', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de02c7e090d456d83b06c6_2.svg',
      borderColor: 'rgba(24, 118, 53, 0.6)',
      background: 'linear-gradient(135deg, rgba(24, 118, 53, 0.15) 0%, rgba(24, 118, 53, 0.08) 100%)',
      component: <StatsWidget /> 
    },
    { 
      id: 'matchup', 
      title: 'Matchup Data', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ee51165777fa2c334aa52b_NEW%20WIDGET%20SVG%27S-4.svg',
      borderColor: 'rgba(217, 217, 217, 0.6)',
      background: 'linear-gradient(135deg, rgba(217, 217, 217, 0.15) 0%, rgba(217, 217, 217, 0.08) 100%)',
      component: <MatchupWidget /> 
    },
    { 
      id: 'news', 
      title: 'News & Insights', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg',
      borderColor: 'rgba(56, 182, 255, 0.6)',
      background: 'linear-gradient(135deg, rgba(56, 182, 255, 0.15) 0%, rgba(56, 182, 255, 0.08) 100%)',
      component: <NewsWidget /> 
    }
  ]

  const row2Widgets = [
    { 
      id: 'propparlay', 
      title: 'Prop Parlay Tool', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg',
      borderColor: 'rgba(94, 23, 235, 0.6)',
      background: 'linear-gradient(135deg, rgba(94, 23, 235, 0.15) 0%, rgba(94, 23, 235, 0.08) 100%)',
      component: <PropParlayWidget /> 
    },
    { 
      id: 'fantasy', 
      title: 'Weekly Fantasy Data', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5da02a4861948acc74_3.svg',
      borderColor: 'rgba(186, 19, 47, 0.6)',
      background: 'linear-gradient(135deg, rgba(186, 19, 47, 0.15) 0%, rgba(186, 19, 47, 0.08) 100%)',
      component: <FantasyWidget /> 
    },
    { 
      id: 'td', 
      title: 'Top TD Scorers', 
      icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68ddef5dd3c882be50e10645_4.svg',
      borderColor: 'rgba(255, 117, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(255, 117, 31, 0.15) 0%, rgba(255, 117, 31, 0.08) 100%)',
      component: <TDWidget /> 
    }
  ]

  return (
    <>
      <style jsx>{`
        .mobile-view {
          display: block;
        }
        .desktop-view {
          display: none;
        }
        @media (min-width: 768px) {
          .mobile-view {
            display: none;
          }
          .desktop-view {
            display: block;
          }
        }
        .accordion-content {
          margin-top: 0.75rem;
        }
        
        /* Glassmorphism enhancements */
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 12px 48px 0 rgba(0, 0, 0, 0.5);
          transform: translateY(-2px);
        }
        
        .glass-section {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <div style={{ padding: '1.5rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        marginBottom: '2rem',
        padding: '0.5rem 1.25rem',
        textAlign: 'left' as const
      }}>
          <p style={{ fontSize: '1.3rem', color: '#ffffff', marginBottom: '0.5rem', fontWeight: '600' }}>
            {welcomeMessage}
          </p>
          <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '0' }}>
            These are the tools you need to be a profitable bettor
          </p>
        </div>
        
        {/* Divider line */}
        <div style={{ 
          width: '100%', 
          height: '1px', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
          marginBottom: '2rem'
        }} />
        
        {/* MOBILE VIEW - Accordion */}
        <div className="mobile-view">
          {/* Row 1: Premium Dashboards */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium Dashboards
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e19b939d84e2e8f4fa209f_5.svg" 
                 style={{ width: '28px', height: '28px' }} alt="" />
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            {row1Widgets.map(widget => (
              <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                <div 
                  onClick={() => toggleWidget(widget.id)}
                  className="glass-card"
                  style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    border: `0.5px solid ${widget.borderColor}`,
                    background: widget.background,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{widget.title}</span>
                  <img src={widget.icon} alt="" style={{ width: '32px', height: '32px' }} />
                </div>
                {expandedWidgets.has(widget.id) && (
                  <div className="accordion-content">
                    <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                      {widget.component}
                    </LockedWidget>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Row 2: Premium NFL Tools */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium NFL tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e19b93de43f1c36af5b432_6.svg" 
                 style={{ width: '28px', height: '28px' }} alt="" />
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            {row2Widgets.map(widget => (
              <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                <div 
                  onClick={() => toggleWidget(widget.id)}
                  className="glass-card"
                  style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    border: `0.5px solid ${widget.borderColor}`,
                    background: widget.background,
                    borderRadius: '14px',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{widget.title}</span>
                  <img src={widget.icon} alt="" style={{ width: '32px', height: '32px' }} />
                </div>
                {expandedWidgets.has(widget.id) && (
                  <div className="accordion-content">
                    <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                      {widget.component}
                    </LockedWidget>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DESKTOP VIEW - Horizontal Scroll Rows */}
        <div className="desktop-view">
          {/* Row 1: Premium Dashboards */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium Dashboards
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e19b939d84e2e8f4fa209f_5.svg" 
                 style={{ width: '28px', height: '28px' }} alt="" />
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            marginBottom: '1.5rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <PicksWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <StatsWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <MatchupWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <NewsWidget />
              </LockedWidget>
            </div>
          </div>

          {/* Row 2: Premium NFL Tools */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium NFL tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e19b93de43f1c36af5b432_6.svg" 
                 style={{ width: '28px', height: '28px' }} alt="" />
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <PropParlayWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <FantasyWidget />
              </LockedWidget>
            </div>
            <div style={{ minWidth: '380px' }}>
              <LockedWidget isLoggedIn={!!firstName} hasSubscription={isSubscribed}>
                <TDWidget />
              </LockedWidget>
            </div>
          </div>
        </div>

        {/* Rest of your existing code */}
        {/* Divider line after Premium NFL tools */}
        <div style={{ 
          width: '100%', 
          height: '1px', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
          margin: '2rem 0'
        }} />

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem 0.5rem',
          textAlign: 'left' as const
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Try our FREE mini betting tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c3ea0594da2784e87_6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} alt="" />
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <a href="https://www.thebettinginsider.com/tools/bankroll-builder" style={toolLinkStyle}>
              <span style={topTagStyle}>TOP</span>
              Bankroll Builder
            </a>
            <a href="https://www.thebettinginsider.com/tools/insider-betting-guide" style={toolLinkStyle}>
              <span style={favTagStyle}>FAV</span>
              Betting Guide
            </a>
            <a href="https://www.thebettinginsider.com/daily-mlb-game-stats" style={toolLinkStyle}>
              Batter v Pitcher
            </a>
            <a href="https://www.thebettinginsider.com/tools/roi-calculator" style={toolLinkStyle}>
              ROI Calculator
            </a>
            <a href="https://www.thebettinginsider.com/tools/parlay-calculator" style={toolLinkStyle}>
              Parlay Calculator
            </a>
            <a href="https://www.thebettinginsider.com/action-systems" style={toolLinkStyle}>
              About Systems
            </a>
          </div>
        </div>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem 0.5rem',
          textAlign: 'left' as const
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Get Help
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c5a2af4dfb7b59b39_7.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} alt="" />
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            <a href="https://billing.stripe.com/p/login/cN2eYg15W3W77rW288" style={helpLinkStyle}>
              Manage Subscription
            </a>
            <a href="https://www.thebettinginsider.com/insider-faqs" style={helpLinkStyle}>
              Common Questions
            </a>
            <a href="https://www.thebettinginsider.com/contact-us" style={helpLinkStyle}>
              Contact Us
            </a>
            <a href="https://www.thebettinginsider.com/contact-us" style={helpLinkStyle}>
              About Company
            </a>
            <a href="https://www.thebettinginsider.com/policies/terms-of-service" style={helpLinkStyle}>
              Terms of Service
            </a>
            <a href="https://www.thebettinginsider.com/policies/refund-policy" style={helpLinkStyle}>
              Refund Policy
            </a>
            <a href="https://www.thebettinginsider.com/policies/privacy-policy" style={helpLinkStyle}>
              Privacy
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

// Welcome message generator
function getWelcomeMessage(firstName: string | null): string {
  const name = firstName || 'friend'
  
  // If no firstName (not logged in), return special message
  if (!firstName) {
    return 'Welcome to Insider Sports, please login to access our tools!'
  }

  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Time-based messages (70% of the time)
  const timeMessages = [
    { condition: hour >= 5 && hour < 12, message: `Good morning, ${name}! Let's start hot` },
    { condition: hour >= 12 && hour < 17, message: `Good afternoon, ${name}! Lines are moving` },
    { condition: hour >= 18 && hour < 23, message: `Evening action incoming, ${name}` },
    { condition: hour >= 0 && hour < 5, message: `Burning the midnight oil, ${name}?` }
  ]

  // Day-based messages - FIXED INDEX (0 = Sunday, 6 = Saturday)
  const dayMessages = [
    `Sunday slate domination, ${name}`, // Sunday (0)
    `Let's start the week strong, ${name}`, // Monday (1)
    `Let's keep the momentum going, ${name}`, // Tuesday (2)
    `Midweek magic time, ${name}`, // Wednesday (3)
    `Let's have a great Thursday, ${name}`, // Thursday (4)
    `Let's finish the week hot, ${name}`, // Friday (5)
    `Weekend action awaits, ${name}`, // Saturday (6)
  ]

  // Basic messages
  const basicMessages = [
    `Welcome back, ${name}!`,
    `Let's dominate today, ${name}`,
    `Ready to win big, ${name}?`,
    `Let's make some money, ${name}`,
    `Time to cash in, ${name}`,
    `Let's have a great day, ${name}`,
    `Welcome to the edge, ${name}`,
    `Let's get after it, ${name}`,
    `Time to find the value, ${name}`,
    `Sharp plays incoming, ${name}`
  ]

  const random = Math.random()

  // 70% time-based
  if (random < 0.7) {
    const timeMessage = timeMessages.find(m => m.condition)
    if (timeMessage) return timeMessage.message
  }

  // 20% day-based
  if (random < 0.9) {
    return dayMessages[day]
  }

  // 10% random basic
  return basicMessages[Math.floor(Math.random() * basicMessages.length)]
}

const toolLinkStyle = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '1rem',
  color: 'white',
  textDecoration: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem',
  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.2)'
}

const helpLinkStyle = {
  color: 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
  fontSize: '0.85rem',
  transition: 'color 0.2s'
}

const topTagStyle = {
  background: '#ef4444',
  color: 'white',
  padding: '0.2rem 0.4rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}

const favTagStyle = {
  background: '#f59e0b',
  color: 'white',
  padding: '0.2rem 0.4rem',
  borderRadius: '4px',
  fontSize: '0.65rem',
  fontWeight: '700'
}