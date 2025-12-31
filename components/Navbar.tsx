'use client'

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Navbar() {
  const pathname = usePathname()
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Always call the hook, but conditionally use it
  const clerkUser = useUser()
  
  // In development, bypass Clerk to avoid CORS errors
  const isSignedIn = isDevelopment ? false : (clerkUser.isSignedIn || false)
  const isLoaded = isDevelopment ? true : clerkUser.isLoaded
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null)

  // Define nav items in order
  const navItems = [
    { href: '/sports/picks', label: "Today's Picks" },
    { href: '/sports/public-betting', label: 'Public Betting' },
    { href: '/sports/ai-scripts', label: 'Game Scripts' },
    { href: '/odds', label: 'Odds' },
    { href: '/builder', label: 'Builder' },
  ]

  // Find active index
  const activeIndex = navItems.findIndex(item => pathname?.startsWith(item.href))
  
  // Get link style based on position relative to active
  const getLinkStyle = (index: number) => {
    if (activeIndex === -1) {
      return styles.navLink
    }
    
    if (index === activeIndex) {
      return { ...styles.navLink, ...styles.navLinkActive }
    }
    
    if (index === activeIndex - 1) {
      // Left adjacent - gradient from left (white) to right (faded)
      return { ...styles.navLink, ...styles.navLinkAdjacent, ...styles.navLinkAdjacentLeft }
    }
    
    if (index === activeIndex + 1) {
      // Right adjacent - gradient from right (white) to left (faded)
      return { ...styles.navLink, ...styles.navLinkAdjacent, ...styles.navLinkAdjacentRight }
    }
    
    return styles.navLink
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setOpenDropdown(null)
  }, [])

  const handleMouseEnter = (itemId: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    setOpenDropdown(itemId)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null)
    }, 300)
    setCloseTimeout(timeout)
  }
  
  const handleDropdownMouseEnter = (itemId: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout)
      setCloseTimeout(null)
    }
    setOpenDropdown(itemId)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    setOpenDropdown(null)
  }

  return (
    <>
      {/* DESKTOP NAVBAR */}
      <nav className="desktop-nav">
        <div style={styles.navContainer}>
          {/* Left section: Logo + Nav Items */}
          <div style={styles.leftSection}>
            <Link href="/" style={styles.logoLink}>
              <img
                src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
                alt="The Betting Insider"
                style={styles.logo}
              />
            </Link>

            {/* Nav Items */}
            <div style={styles.navItems}>
              {navItems.map((item, index) => {
                const linkStyle = getLinkStyle(index)
                const isActive = index === activeIndex
                const isLeftAdjacent = index === activeIndex - 1
                const isRightAdjacent = index === activeIndex + 1
                
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    style={linkStyle}
                    data-active={isActive ? 'true' : 'false'}
                    data-adjacent-left={isLeftAdjacent ? 'true' : 'false'}
                    data-adjacent-right={isRightAdjacent ? 'true' : 'false'}
                  >
                    {item.label}
                    {item.href === '/builder' && (
                      <>
                        {' '}
                        <span style={styles.newTag}>NEW</span>
                      </>
                    )}
              </Link>
                )
              })}

              {/* Sports Dropdown */}
              <div
                style={styles.navDropdown}
                onMouseEnter={() => handleMouseEnter('sports')}
                onMouseLeave={handleMouseLeave}
              >
                <span style={styles.navLink}>
                  Sports
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}>
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </span>
                
                {openDropdown === 'sports' && (
                  <div 
                    className="navbar-dropdown"
                    style={styles.dropdown}
                    onMouseEnter={() => handleDropdownMouseEnter('sports')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link href="/sports/nfl/games" style={styles.dropdownLink}>
                      <img 
                        src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg" 
                        alt="NFL" 
                        style={styles.sportLogo}
                      />
                      NFL
                    </Link>
                    <Link href="/sports/nba/games" style={styles.dropdownLink}>
                      <img 
                        src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg" 
                        alt="NBA" 
                        style={styles.sportLogo}
                      />
                      NBA
                    </Link>
                    <Link href="/sports/nhl/games" style={styles.dropdownLink}>
                      <img 
                        src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg" 
                        alt="NHL" 
                        style={styles.sportLogo}
                      />
                      NHL
                    </Link>
                    <Link href="/sports/college-football/games" style={styles.dropdownLink}>
                      <img 
                        src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg" 
                        alt="NCAAF" 
                        style={styles.sportLogo}
                      />
                      NCAAF
                    </Link>
                    <div style={{...styles.dropdownLink, opacity: 0.5, cursor: 'default'}}>
                      <img 
                        src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg" 
                        alt="NCAAB" 
                        style={{...styles.sportLogo, opacity: 0.5}}
                      />
                      NCAAB (soon)
                    </div>
                  </div>
                )}
              </div>

              {/* Tools Dropdown */}
              <div
                style={styles.navDropdown}
                onMouseEnter={() => handleMouseEnter('tools')}
                onMouseLeave={handleMouseLeave}
              >
                <span style={styles.navLink}>
                  Tools
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}>
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </span>
                
                {openDropdown === 'tools' && (
                  <div 
                    className="navbar-dropdown"
                    style={styles.dropdown}
                    onMouseEnter={() => handleDropdownMouseEnter('tools')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link href="/fantasy" style={styles.dropdownLink}>
                      Fantasy
                    </Link>
                    <Link href="/simulator" style={styles.dropdownLink}>
                      Simulator
                    </Link>
                    <Link href="/prop-parlay-tool" style={styles.dropdownLink}>
                      Perfect Parlays
                    </Link>
                    <Link href="/bankroll-builder" style={styles.dropdownLink}>
                      Bankroll Builder
                    </Link>
                    <Link href="/betting-guide" style={styles.dropdownLink}>
                      Betting Guide
                    </Link>
                    <Link href="/roi-calculator" style={styles.dropdownLink}>
                      ROI Calculator
                    </Link>
                    <Link href="/anytime-td" style={styles.dropdownLink}>
                      Anytime TD's
                    </Link>
                    <Link href="/sportsbooks" style={styles.dropdownLink}>
                      Top Sportsbooks
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Auth */}
          <div style={styles.authSection}>
            {!isLoaded ? (
              <div style={styles.authLoading}>...</div>
            ) : isSignedIn ? (
              isDevelopment ? (
                <div style={styles.devAvatar}>D</div>
              ) : (
                <UserButton
                  appearance={{
                    baseTheme: undefined,
                    variables: {
                      colorBackground: '#1e293b',
                      colorInputBackground: '#0f172a',
                      colorText: '#ffffff',
                      colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
                      colorPrimary: '#3b82f6',
                      colorDanger: '#ef4444'
                    },
                    elements: {
                      userButtonAvatarBox: { width: '40px', height: '40px' },
                      card: { backgroundColor: '#1e293b', color: '#ffffff' },
                      userButtonPopoverCard: { backgroundColor: '#1e293b', color: '#ffffff' },
                      userButtonPopoverActions: { color: '#ffffff' },
                      userButtonPopoverActionButton: { color: '#ffffff' },
                      userButtonPopoverActionButtonText: { color: '#ffffff' }
                    }
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Link label="Home" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>} href="/sports" />
                    <UserButton.Link label="Manage Subscription" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>} href="/manage-subscription" />
                    <UserButton.Action label="View Pricing" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>} onClick={() => window.location.href = '/pricing'} />
                  </UserButton.MenuItems>
                </UserButton>
              )
            ) : (
              <div style={styles.authButtons}>
                <SignInButton mode="modal">
                  <button style={styles.signInBtn}>Sign In</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button style={styles.signUpBtn}>Sign Up</button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MOBILE NAVBAR */}
      <nav className="mobile-nav">
        <div style={styles.mobileNavContainer}>
          {/* Hamburger Menu */}
          <button
            style={styles.hamburger}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span style={{
              ...styles.hamburgerLine,
              transform: mobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
            }}></span>
            <span style={{
              ...styles.hamburgerLine,
              opacity: mobileMenuOpen ? 0 : 1
            }}></span>
            <span style={{
              ...styles.hamburgerLine,
              transform: mobileMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none'
            }}></span>
          </button>

          {/* Logo */}
          <Link href="/" onClick={closeMobileMenu}>
            <img
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
              alt="The Betting Insider"
              style={styles.mobileLogo}
            />
          </Link>

          {/* Auth */}
          <div style={styles.mobileAuth}>
            {!isLoaded ? (
              <div style={styles.authLoading}>...</div>
            ) : isSignedIn ? (
              isDevelopment ? (
                <div style={styles.devAvatar}>D</div>
              ) : (
                <UserButton
                  appearance={{
                    baseTheme: undefined,
                    variables: {
                      colorBackground: '#1e293b',
                      colorInputBackground: '#0f172a',
                      colorText: '#ffffff',
                      colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
                      colorPrimary: '#3b82f6',
                      colorDanger: '#ef4444'
                    },
                    elements: {
                      userButtonAvatarBox: { width: '36px', height: '36px' },
                      card: { backgroundColor: '#1e293b', color: '#ffffff' },
                      userButtonPopoverCard: { backgroundColor: '#1e293b', color: '#ffffff' },
                      userButtonPopoverActions: { color: '#ffffff' },
                      userButtonPopoverActionButton: { color: '#ffffff' },
                      userButtonPopoverActionButtonText: { color: '#ffffff' }
                    }
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Link label="Home" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>} href="/sports" />
                    <UserButton.Link label="Manage Subscription" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>} href="/manage-subscription" />
                    <UserButton.Action label="View Pricing" labelIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>} onClick={() => window.location.href = '/pricing'} />
                  </UserButton.MenuItems>
                </UserButton>
              )
            ) : (
              <SignUpButton mode="modal">
                <button style={styles.mobileSignUpBtn}>Sign Up</button>
              </SignUpButton>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div style={styles.mobileMenu}>
            <Link href="/sports/picks" style={styles.mobileLink} onClick={closeMobileMenu}>
              Today's Picks
            </Link>
            
            <Link href="/sports/public-betting" style={styles.mobileLink} onClick={closeMobileMenu}>
              Public Betting
            </Link>
            
            <Link href="/sports/ai-scripts" style={styles.mobileLink} onClick={closeMobileMenu}>
              Game Scripts
            </Link>
            
            <Link href="/odds" style={styles.mobileLink} onClick={closeMobileMenu}>
              Odds
            </Link>
            
            <Link href="/builder" style={styles.mobileLink} onClick={closeMobileMenu}>
              Builder{' '}
              <span style={styles.newTag}>NEW</span>
            </Link>

            {/* Sports */}
            <div style={styles.mobileDropdownItem}>
              <div
                style={styles.mobileDropdownHeader}
                onClick={() => setOpenDropdown(openDropdown === 'sports' ? null : 'sports')}
              >
                Sports
                <span style={styles.mobileArrow}>{openDropdown === 'sports' ? '▼' : '▶'}</span>
              </div>

              {openDropdown === 'sports' && (
                <div style={styles.mobileSubMenu}>
                  <Link href="/sports/nfl/games" style={styles.mobileSubLink} onClick={closeMobileMenu}>
                    <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322bf75f88b0e514815a_1.svg" alt="NFL" style={styles.sportLogo} />
                    NFL
                  </Link>
                  <Link href="/sports/nba/games" style={styles.mobileSubLink} onClick={closeMobileMenu}>
                    <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ae219bb4e9f221240_2.svg" alt="NBA" style={styles.sportLogo} />
                    NBA
                  </Link>
                  <Link href="/sports/nhl/games" style={styles.mobileSubLink} onClick={closeMobileMenu}>
                    <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b09c4ee482d9ba578_6.svg" alt="NHL" style={styles.sportLogo} />
                    NHL
                  </Link>
                  <Link href="/sports/college-football/games" style={styles.mobileSubLink} onClick={closeMobileMenu}>
                    <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322ba3d7e3f2bf6ce88f_4.svg" alt="NCAAF" style={styles.sportLogo} />
                    NCAAF
                  </Link>
                  <div style={{...styles.mobileSubLink, opacity: 0.5}}>
                    <img src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/6911322b63f708e0881f1517_5.svg" alt="NCAAB" style={{...styles.sportLogo, opacity: 0.5}} />
                    NCAAB (soon)
                  </div>
                </div>
              )}
            </div>

            {/* Tools */}
            <div style={styles.mobileDropdownItem}>
              <div
                style={styles.mobileDropdownHeader}
                onClick={() => setOpenDropdown(openDropdown === 'tools' ? null : 'tools')}
              >
                Tools
                <span style={styles.mobileArrow}>{openDropdown === 'tools' ? '▼' : '▶'}</span>
              </div>

              {openDropdown === 'tools' && (
                <div style={styles.mobileSubMenu}>
                  <Link href="/fantasy" style={styles.mobileSubLink} onClick={closeMobileMenu}>Fantasy</Link>
                  <Link href="/simulator" style={styles.mobileSubLink} onClick={closeMobileMenu}>Simulator</Link>
                  <Link href="/prop-parlay-tool" style={styles.mobileSubLink} onClick={closeMobileMenu}>Perfect Parlays</Link>
                  <Link href="/bankroll-builder" style={styles.mobileSubLink} onClick={closeMobileMenu}>Bankroll Builder</Link>
                  <Link href="/betting-guide" style={styles.mobileSubLink} onClick={closeMobileMenu}>Betting Guide</Link>
                  <Link href="/roi-calculator" style={styles.mobileSubLink} onClick={closeMobileMenu}>ROI Calculator</Link>
                  <Link href="/anytime-td" style={styles.mobileSubLink} onClick={closeMobileMenu}>Anytime TD's</Link>
                  <Link href="/sportsbooks" style={styles.mobileSubLink} onClick={closeMobileMenu}>Top Sportsbooks</Link>
                </div>
              )}
            </div>

            {/* Sign In link for non-signed in users */}
            {!isSignedIn && (
              <div style={styles.mobileSignInSection}>
                <SignInButton mode="modal">
                  <button style={styles.mobileSignInLink}>
                    Already have an account? Sign In
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  // DESKTOP STYLES
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '0 32px',
    height: '64px',
    minHeight: '64px',
    maxHeight: '64px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: 'visible',
  },
  
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    overflow: 'visible',
  },
  
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
  },
  
  logo: {
    height: '50px',
    width: 'auto',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  
  navItems: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'visible',
    position: 'relative',
  },
  
  navLink: {
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
  },
  
  navLinkActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  navLinkAdjacent: {
    position: 'relative',
  },
  
  navLinkAdjacentLeft: {
    // Gradient from left (white) fading to right
  },
  
  navLinkAdjacentRight: {
    // Gradient from right (white) fading to left
  },
  
  navLinkHighlight: {
    display: 'flex',
    alignItems: 'center',
    color: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(50, 51, 53, 0.5)',
    transition: 'all 0.15s ease',
  },
  
  navDropdown: {
    position: 'relative',
    cursor: 'pointer',
    zIndex: 100002,
    isolation: 'isolate',
  },
  
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 2px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #161F2B 0%, #0C0E12 50%, #161F2B 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(50, 51, 53, 0.5)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    borderRadius: '12px',
    padding: '8px',
    minWidth: '180px',
    zIndex: 100001,
    pointerEvents: 'auto',
    isolation: 'isolate',
  },
  
  dropdownLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.875rem',
    fontWeight: '500',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.15s ease',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  sportLogo: {
    width: '20px',
    height: '20px',
    objectFit: 'contain' as const,
  },
  
  authSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  
  signInBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '8px 16px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  signUpBtn: {
    background: 'rgba(41, 47, 63, 0.6)',
    border: '1px solid rgba(50, 51, 53, 0.5)',
    color: '#FFFFFF',
    padding: '6px 12px',
    height: '32px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  devAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  
  authLoading: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  // MOBILE STYLES
  mobileNavContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    width: '100%',
    padding: '0 16px',
    height: '56px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
  },
  
  hamburger: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    zIndex: 1002,
    justifySelf: 'flex-start',
  },
  
  hamburgerLine: {
    width: '22px',
    height: '2px',
    background: '#ffffff',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
  },
  
  mobileLogo: {
    height: '60px',
    width: 'auto',
    justifySelf: 'center',
    gridColumn: '2',
  },
  
  mobileAuth: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    justifySelf: 'flex-end',
    gridColumn: '3',
    height: '100%',
  },
  
  mobileSignUpBtn: {
    background: 'rgba(41, 47, 63, 0.6)',
    border: '1px solid rgba(50, 51, 53, 0.5)',
    color: '#FFFFFF',
    padding: '6px 12px',
    height: '32px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    margin: 0,
  },
  
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    background: 'linear-gradient(180deg, #0C0E12 0%, #12151B 100%)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(50, 51, 53, 0.5)',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    zIndex: 100001,
    maxHeight: 'calc(100vh - 64px)',
    overflowY: 'auto',
  },
  
  mobileLink: {
    display: 'block',
    width: '100%',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '1rem',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '16px 24px',
    transition: 'all 0.15s ease',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  mobileLinkHighlight: {
    display: 'block',
    width: '100%',
    color: '#FFFFFF',
    fontSize: '1rem',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '16px 24px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderLeft: '3px solid rgba(50, 51, 53, 0.5)',
  },
  
  mobileDropdownItem: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  
  mobileDropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '1rem',
    fontWeight: '500',
    padding: '16px 24px',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  mobileArrow: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  
  mobileSubMenu: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    background: 'rgba(29, 37, 48, 0.3)',
    borderTop: '1px solid rgba(50, 51, 53, 0.5)',
    borderBottom: '1px solid rgba(50, 51, 53, 0.5)',
  },
  
  mobileSubLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none',
    padding: '14px 36px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  mobileSignInSection: {
    marginTop: '16px',
    padding: '16px 24px 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  
  mobileSignInLink: {
    background: 'transparent',
    border: 'none',
    color: '#696969',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  
  newTag: {
    display: 'inline-block',
    marginLeft: '2px',
    padding: '1px 2px',
    fontSize: '0.4rem',
    fontWeight: '600',
    color: '#696969',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    lineHeight: '1',
    verticalAlign: 'top',
    transform: 'translateY(-2px)',
    pointerEvents: 'none',
  },
}
