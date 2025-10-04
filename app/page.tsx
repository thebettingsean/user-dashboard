import PicksWidget from '../components/PicksWidget'
import StatsWidget from '../components/StatsWidget'
import FantasyWidget from '../components/FantasyWidget'
import TDWidget from '../components/TDWidget'
import NewsWidget from '../components/NewsWidget'
import PropParlayWidget from '../components/PropParlayWidget'

export default function Home() {
  return (
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
      
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        overflowX: 'auto', 
        paddingBottom: '1rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.2) transparent'
      }}>
        <div style={{ minWidth: '380px' }}><PicksWidget /></div>
        <div style={{ minWidth: '380px' }}><StatsWidget /></div>
        <div style={{ minWidth: '380px' }}><FantasyWidget /></div>
        <div style={{ minWidth: '380px' }}><TDWidget /></div>
        <div style={{ minWidth: '380px' }}><PropParlayWidget /></div>
        <div style={{ minWidth: '380px' }}><NewsWidget /></div>
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