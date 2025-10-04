'use client'

import { useState } from 'react'
import PicksWidget from '../components/PicksWidget'
import StatsWidget from '../components/StatsWidget'
import FantasyWidget from '../components/FantasyWidget'
import TDWidget from '../components/TDWidget'
import NewsWidget from '../components/NewsWidget'
import PropParlayWidget from '../components/PropParlayWidget'

export default function Home() {
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())

  function toggleWidget(widgetId: string) {
    const newExpanded = new Set(expandedWidgets)
    if (newExpanded.has(widgetId)) {
      newExpanded.delete(widgetId)
    } else {
      newExpanded.add(widgetId)
    }
    setExpandedWidgets(newExpanded)
  }

  const row1Widgets = [
    { id: 'picks', title: 'Picks Dashboard', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg', component: <PicksWidget /> },
    { id: 'stats', title: 'Stats Dashboard', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg', component: <StatsWidget /> },
    { id: 'news', title: 'News & Insights', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg', component: <NewsWidget /> }
  ]

  const row2Widgets = [
    { id: 'propparlay', title: 'Prop Parlay Tool', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e144f04701a7e18985bc19_TICKET-5.svg', component: <PropParlayWidget /> },
    { id: 'fantasy', title: 'Fantasy Dashboard', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg', component: <FantasyWidget /> },
    { id: 'td', title: 'TD Dashboard', icon: 'https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0a1f1cd5677fd1b26751_NEW%20WIDGET%20SVG%27S-2.svg', component: <TDWidget /> }
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
        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }
        .accordion-header:hover {
          background: rgba(255,255,255,0.05);
        }
        .accordion-content {
          margin-top: 0.75rem;
        }
      `}</style>

      <div style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '0.35rem', fontWeight: '500' }}>
            Welcome to a bettors paradise, friend
          </p>
          <p style={{ fontSize: '0.95rem', opacity: 0.6, marginBottom: '1rem' }}>
            Let's have ourselves a day!
          </p>
          <hr style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '2rem' }} />
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            You've got all of our powerful betting tools 
            <span style={{ 
              background: 'linear-gradient(135deg, #C0C0C0 0%, #E5E5E5 50%, #B8B8B8 100%)',
              color: '#1e293b',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '1.4rem',
              fontWeight: '800',
              letterSpacing: '0.05em'
            }}>UNLOCKED</span>
          </h1>
          <hr style={{ border: 'none', height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '3rem' }} />
        </div>
        
        {/* MOBILE VIEW - Accordion */}
        <div className="mobile-view">
          {/* Row 1: Premium Dashboards */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium Dashboards
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e151ee32b17a59b6a96a6c_TICKET-6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            {row1Widgets.map(widget => (
              <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                <div 
                  className="accordion-header"
                  onClick={() => toggleWidget(widget.id)}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{widget.title}</span>
                  <img src={widget.icon} alt="" style={{ width: '32px', height: '32px' }} />
                </div>
                {expandedWidgets.has(widget.id) && (
                  <div className="accordion-content">
                    {widget.component}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Row 2: Premium NFL Tools */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium NFL tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e151ee32b17a59b6a96a6c_TICKET-6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
          </h3>
          <div style={{ marginBottom: '2rem' }}>
            {row2Widgets.map(widget => (
              <div key={widget.id} style={{ marginBottom: '0.75rem' }}>
                <div 
                  className="accordion-header"
                  onClick={() => toggleWidget(widget.id)}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>{widget.title}</span>
                  <img src={widget.icon} alt="" style={{ width: '32px', height: '32px' }} />
                </div>
                {expandedWidgets.has(widget.id) && (
                  <div className="accordion-content">
                    {widget.component}
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
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e151ee32b17a59b6a96a6c_TICKET-6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
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
            <div style={{ minWidth: '380px' }}><PicksWidget /></div>
            <div style={{ minWidth: '380px' }}><StatsWidget /></div>
            <div style={{ minWidth: '380px' }}><NewsWidget /></div>
          </div>

          {/* Row 2: Premium NFL Tools */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Premium NFL tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e151ee32b17a59b6a96a6c_TICKET-6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
          </h3>
          <div style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            <div style={{ minWidth: '380px' }}><PropParlayWidget /></div>
            <div style={{ minWidth: '380px' }}><FantasyWidget /></div>
            <div style={{ minWidth: '380px' }}><TDWidget /></div>
          </div>
        </div>

        {/* Rest of your code stays the same */}
        <div style={{ marginTop: '4rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Try our FREE mini betting tools
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c3ea0594da2784e87_6.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
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

        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Get Help
            <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68de0f9c5a2af4dfb7b59b39_7.svg" 
                 style={{ width: '28px', height: '28px', opacity: 0.7 }} />
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

const toolLinkStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '1rem',
  color: 'white',
  textDecoration: 'none',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem'
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